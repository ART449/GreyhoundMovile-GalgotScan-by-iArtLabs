import type { FreezeFrame, VehicleModule } from "@/lib/simulator";
import {
  decodeLoad,
  decodeMap,
  decodeRpm,
  decodeSpeed,
  decodeTemp,
  decodeVoltage,
  elmError,
  looksLikeElm,
  parseDtcs,
  parseMil,
  parseProtocol,
  parseVin,
  pidPayload,
  stripElmNoise,
} from "@/lib/obd/parse";
import {
  emptyAdvanced,
  labelPids,
  parseAtDpn,
  parseCvn,
  parseDtcsSid,
  parseJ1939Dm1,
  parseMode06,
  parseMode09Ascii,
  parsePidBitmap,
  parseReadiness,
  parseUdsAlive,
  type AdvancedScan,
} from "@/lib/obd/advanced";
import { familyFromName, HUNT_ORDER } from "@/lib/obd/protocols";
import { decodeVin } from "@/lib/obd/vin";
import { decodeLambda, decodeO2Voltage, decodeTrimByte, type OxygenSample } from "@/lib/obd/oxygen";
import { FtdiUsbPort, isFtdiDevice } from "@/lib/obd/ftdi";
import { isAndroid } from "@/lib/obd/host";

const BAUD_TRIES = [115200, 38400, 9600, 57600, 230400, 1_000_000];

const USB_VENDOR_FILTERS = [
  { vendorId: 0x0403 },
  { vendorId: 0x10c4 },
  { vendorId: 0x1a86 },
  { vendorId: 0x067b },
];

const MODULES: { id: string; name: string; req: string; rsp: string }[] = [
  { id: "ecm", name: "ECM · Motor", req: "7E0", rsp: "7E8" },
  { id: "tcm", name: "TCM · Transmisión", req: "7E1", rsp: "7E9" },
  { id: "abs", name: "ABS / ESC", req: "760", rsp: "768" },
  { id: "srs", name: "Airbag / SRS", req: "7E5", rsp: "7ED" },
  { id: "bcm", name: "BCM · Carrocería", req: "7E2", rsp: "7EA" },
  { id: "cluster", name: "Cluster", req: "7E3", rsp: "7EB" },
];

const BLE_SERVICES: Array<string | number> = [
  0xfff0, 0xffe0, 0xff10, 0xff00, 0xffe5,
  "0000fff0-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000ff10-0000-1000-8000-00805f9b34fb",
  "0000fff0-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c32-fe89a8f8c9d",
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
];

export type LiveScan = {
  protocol: string;
  adapter: string;
  vin: string;
  marca: string;
  modelo: string;
  anio: number;
  mil: boolean;
  codes: string[];
  linkMs: number;
  modules: VehicleModule[];
  baud: number;
  freeze: FreezeFrame | null;
  freezeLive: boolean;
};

type GalgotPort = {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open: (options: { baudRate: number; dataBits?: 7 | 8; stopBits?: 1 | 2; parity?: "none" | "even" | "odd"; bufferSize?: number; flowControl?: "none" | "hardware" }) => Promise<void>;
  close: () => Promise<void>;
  setSignals?: (signals: { dataTerminalReady?: boolean; requestToSend?: boolean }) => Promise<void>;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number };
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getSerialApi(): Promise<Serial> {
  if (typeof navigator !== "undefined" && navigator.serial) return navigator.serial;
  const mod = await import("web-serial-polyfill");
  return mod.serial as unknown as Serial;
}

export function serialSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return Boolean(navigator.serial) || Boolean(navigator.usb);
}

export function bluetoothSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return Boolean(navigator.bluetooth);
}

export function spanishSerialError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  const msg = err instanceof Error ? err.message : String(err);
  if (name === "NotFoundError") {
    return "No elegiste ningún dispositivo. En la Active 5 elige FTDI / vLinker / 0403. Vuelve a pulsar.";
  }
  if (name === "SecurityError" || /not allowed|permissions policy|denied|iframe/i.test(msg)) {
    return "Este visor bloquea USB. Abre GALGOT en Chrome de la Active 5 (pestaña completa, no el recuadro) y conecta ahí.";
  }
  if (name === "NetworkError" || /open|already|gatt|claim/i.test(msg)) {
    return "El puerto está ocupado. Cierra Serial USB Terminal u otra app y reintenta.";
  }
  if (name === "NotSupportedError") {
    return "Este Chrome no habla con ese adaptador. En la Active 5 usa el vLinker FS por USB-C + OTG.";
  }
  if (/interface with class/i.test(msg)) {
    return "Ese diálogo busca CDC, no FTDI. El vLinker entra por WebUSB: pulsa conectar y elige VGATE / FTDI.";
  }
  return msg || "No se pudo abrir el adaptador.";
}

export class Elm327 {
  private port: GalgotPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private bleDevice: BluetoothDevice | null = null;
  private bleWrite: BluetoothRemoteGATTCharacteristic | null = null;
  private rx = "";
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private chain: Promise<unknown> = Promise.resolve();
  private pumping = false;
  onLog: ((line: string) => void) | null = null;
  baud = 115200;
  adapterId = "";
  protocol = "";
  aborted = false;
  via: "usb" | "ble" = "usb";

  private log(line: string) {
    this.onLog?.(line);
  }

  async requestAndOpen(): Promise<void> {
    this.via = "usb";
    if (isAndroid() && navigator.usb) {
      await this.requestAndOpenWebUsb();
      return;
    }
    if (typeof navigator !== "undefined" && navigator.serial) {
      const serial = await getSerialApi();
      const port = await serial.requestPort({ filters: [] });
      await this.openWithBaud(port as unknown as GalgotPort);
      return;
    }
    if (typeof navigator !== "undefined" && navigator.usb) {
      await this.requestAndOpenWebUsb();
      return;
    }
    throw new Error(
      "Este navegador no expone USB. En la Blackview Active 5 abre GALGOT con Chrome, no con el visor.",
    );
  }

  private async requestAndOpenWebUsb(): Promise<void> {
    if (!navigator.usb) {
      throw new Error("Este Chrome no tiene WebUSB. Actualiza Chrome en la Active 5.");
    }
    const device = await navigator.usb.requestDevice({ filters: USB_VENDOR_FILTERS });
    const tag = device.productName || device.manufacturerName || `USB ${hexVid(device.vendorId)}`;
    this.log(`USB ${hexVid(device.vendorId)}:${hexVid(device.productId)} · ${tag}`);
    if (isFtdiDevice(device)) {
      const port = new FtdiUsbPort(device);
      await this.openWithBaud(port);
      if (!this.adapterId || this.adapterId === "ELM327") this.adapterId = "vLinker FS";
      return;
    }
    throw new Error(
      `Chip USB ${hexVid(device.vendorId)} no es FTDI. El vLinker FS sí (0403). Enchufa ese y elige FTDI en el diálogo.`,
    );
  }

  async requestAndOpenBle(): Promise<void> {
    this.via = "ble";
    if (!navigator.bluetooth) {
      throw new Error("Este Chrome no tiene Bluetooth web. En la Active 5 usa el vLinker por USB.");
    }
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: BLE_SERVICES,
    });
    if (!device.gatt) throw new Error("El Bluetooth no expuso GATT. El vLinker FS es USB, no BLE.");
    this.log(`BLE ${device.name || "adaptador"}`);
    const server = await device.gatt.connect();
    const uart = await findUart(server);
    await uart.notify.startNotifications();
    uart.notify.addEventListener("characteristicvaluechanged", (ev) => {
      const target = ev.target as BluetoothRemoteGATTCharacteristic;
      const view = target.value;
      if (!view) return;
      this.pushBytes(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    });
    this.bleDevice = device;
    this.bleWrite = uart.write;
    this.baud = 0;
    this.adapterId = device.name || "ELM327 BLE";
    await this.kick();
    const id = await this.command("ATZ", 4500);
    this.adapterId = pickIdentity(id, this.adapterId);
    this.log(this.adapterId);
  }

  private async openWithBaud(port: GalgotPort): Promise<void> {
    let last: unknown;
    for (const baud of BAUD_TRIES) {
      try {
        await this.closeQuiet();
        await sleep(80);
        await port.open({
          baudRate: baud,
          dataBits: 8,
          stopBits: 1,
          parity: "none",
          bufferSize: 8192,
          flowControl: "none",
        });
        this.port = port;
        this.baud = baud;
        this.writer = port.writable?.getWriter() ?? null;
        this.reader = port.readable?.getReader() ?? null;
        try {
          await port.setSignals?.({ dataTerminalReady: true, requestToSend: true });
        } catch {
          /* algunos CDC no implementan señales */
        }
        this.pump();
        await this.kick();
        this.log(`USB ${baud} baud`);
        const id = await this.command("ATZ", 4500);
        if (!id.trim() || looksLikeElm(id) || /vlinker|vgate|stn/i.test(id)) {
          this.adapterId = pickIdentity(id, "vLinker FS");
          this.log(this.adapterId);
          await sleep(250);
          return;
        }
        last = new Error("sin banner ELM");
      } catch (err) {
        last = err;
        this.log(`baud ${baud} falló`);
      }
    }
    throw last instanceof Error
      ? last
      : new Error("No respondió el vLinker. OTG USB-C, ignición ON, 115200. Cierra FORScan si lo tenías a 1 Mbps.");
  }

  private pushBytes(value: Uint8Array) {
    this.rx += this.decoder.decode(value, { stream: true });
  }

  private async kick() {
    await this.writeRaw("\r\r");
    await sleep(220);
    this.rx = "";
  }

  private async writeRaw(text: string) {
    const bytes = this.encoder.encode(text);
    if (this.bleWrite) {
      for (let i = 0; i < bytes.length; i += 20) {
        const slice = bytes.slice(i, i + 20);
        if (this.bleWrite.properties.writeWithoutResponse) {
          await this.bleWrite.writeValueWithoutResponse(slice);
        } else {
          await this.bleWrite.writeValue(slice);
        }
      }
      return;
    }
    if (!this.writer) throw new Error("Adaptador cerrado");
    await this.writer.write(bytes);
  }

  private async pump() {
    if (!this.reader || this.pumping) return;
    this.pumping = true;
    while (this.pumping && this.reader) {
      try {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) this.pushBytes(value);
      } catch {
        break;
      }
    }
    this.pumping = false;
  }

  command(cmd: string, timeoutMs = 2500): Promise<string> {
    const run = this.chain.then(() => this.commandInner(cmd, timeoutMs));
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async commandInner(cmd: string, timeoutMs: number): Promise<string> {
    if (this.aborted) throw new Error("cancelado");
    this.rx = "";
    this.log(`>> ${cmd}`);
    await this.writeRaw(`${cmd}\r`);
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (this.aborted) throw new Error("cancelado");
      if (this.rx.includes(">")) {
        const raw = this.rx;
        this.rx = "";
        const cleaned = this.clean(raw, cmd);
        this.log(`<< ${preview(cleaned)}`);
        return cleaned;
      }
      await sleep(20);
    }
    const leftover = this.rx;
    this.rx = "";
    if (leftover.trim()) {
      const cleaned = this.clean(leftover, cmd);
      this.log(`<< ${preview(cleaned)}`);
      return cleaned;
    }
    this.log(`<< (sin respuesta a ${cmd})`);
    throw new Error(`Sin respuesta a ${cmd}`);
  }

  private clean(raw: string, cmd: string): string {
    const lines = stripElmNoise(raw)
      .split("\n")
      .map((l) => l.replace(/>/g, "").trim())
      .filter((l) => l && l.toUpperCase() !== cmd.toUpperCase());
    return lines.join("\n");
  }

  async wake(): Promise<void> {
    this.aborted = false;
    for (const cmd of ["ATE0", "ATL0", "ATS0", "ATH0", "ATAL"]) {
      try {
        await this.command(cmd, 1500);
      } catch {
        /* clon sordo a uno */
      }
    }
    try {
      const ati = await this.command("ATI", 1500);
      if (ati.trim()) this.adapterId = pickIdentity(ati, this.adapterId);
    } catch {
      /* */
    }
  }

  async configureProtocol(): Promise<void> {
    let lastErr: Error | null = null;
    for (const step of HUNT_ORDER) {
      try {
        this.log(step.name);
        await this.command(step.elm, 2000);
        const probe = await this.command("0100", step.timeout);
        const err = elmError(probe);
        if (err && err !== "NO DATA") throw new Error(err);
        if (/41\s*00/i.test(probe) || hexHas(probe, 0x41, 0x00) || parsePidBitmap(probe).length > 0) {
          try {
            const dp = await this.command("ATDP", 1200);
            this.protocol = parseProtocol(dp) || step.name;
          } catch {
            this.protocol = step.name;
          }
          return;
        }
        lastErr = new Error(`0100 no contestó en ${step.name}`);
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        this.log(`${step.name} falló`);
      }
    }
    throw lastErr ?? new Error("Sin protocolo. Ignición ON, OBD asentado, vLinker en 115200.");
  }

  async scanLink(): Promise<LiveScan> {
    const t0 = performance.now();
    let vin = "";
    try {
      vin = parseVin(await this.command("0902", 4000));
    } catch {
      /* */
    }
    const decoded = decodeVin(vin);
    const dtc = await this.readDtcs();
    let freeze: FreezeFrame | null = null;
    let freezeLive = false;
    try {
      const ff = await this.readFreeze();
      freeze = ff.frame;
      freezeLive = ff.live;
    } catch {
      /* */
    }
    const modules = await this.pingModules();
    const linkMs = Math.max(1, Math.round(performance.now() - t0));
    return {
      protocol: this.protocol || "ISO 15765-4 CAN",
      adapter: this.adapterId,
      vin,
      marca: decoded.marca,
      modelo: decoded.modelo,
      anio: decoded.anio,
      mil: dtc.mil,
      codes: dtc.codes,
      linkMs,
      modules,
      baud: this.baud,
      freeze,
      freezeLive,
    };
  }

  async readDtcs(): Promise<{ mil: boolean; codes: string[] }> {
    let mil = false;
    try {
      const pid01 = await this.command("0101", 2000);
      const parsed = parseMil(pid01);
      if (parsed) mil = parsed.mil;
    } catch {
      /* */
    }
    let stored: string[] = [];
    try {
      stored = parseDtcs(await this.command("03", 4000));
    } catch {
      stored = [];
    }
    let pending: string[] = [];
    try {
      pending = parseDtcs(await this.command("07", 2500));
    } catch {
      pending = [];
    }
    const codes = [...new Set([...stored, ...pending])];
    return { mil: mil || codes.length > 0, codes };
  }

  private async pingModules(): Promise<VehicleModule[]> {
    const out: VehicleModule[] = [];
    for (const mod of MODULES) {
      const t0 = performance.now();
      try {
        await this.command(`ATSH${mod.req}`, 800);
        try {
          await this.command(`ATCRA${mod.rsp}`, 600);
        } catch {
          /* CRA no es universal */
        }
        const rsp = await this.command("0100", 1200);
        const latencyMs = Math.max(1, Math.round(performance.now() - t0));
        const err = elmError(rsp);
        let ok = /41\s*00/i.test(rsp) || hexHas(rsp, 0x41, 0x00);
        if (!ok) {
          try {
            const uds = await this.command("3E00", 800);
            ok = parseUdsAlive(uds) || /7E/i.test(uds);
          } catch {
            ok = false;
          }
        }
        out.push({
          id: mod.id,
          name: mod.name,
          protocol: this.protocol || "ISO 15765-4 CAN 11/500",
          status: ok ? "ok" : err === "NO DATA" ? "timeout" : "error",
          latencyMs: ok ? latencyMs : 0,
        });
      } catch {
        out.push({
          id: mod.id,
          name: mod.name,
          protocol: this.protocol || "ISO 15765-4 CAN 11/500",
          status: "timeout",
          latencyMs: 0,
        });
      }
    }
    try {
      await this.command("ATAR", 800);
      await this.command("ATSH7DF", 800);
    } catch {
      /* restore headers */
    }
    return out;
  }

  async scanAdvanced(): Promise<AdvancedScan> {
    const scan = emptyAdvanced(this.protocol);
    try {
      const dpn = await this.command("ATDPN", 1200);
      scan.protocolCode = parseAtDpn(dpn);
    } catch {
      /* STN / clon */
    }
    try {
      const dp = await this.command("ATDP", 1200);
      scan.protocolName = parseProtocol(dp) || this.protocol;
    } catch {
      /* */
    }
    scan.family = familyFromName(scan.protocolName || this.protocol);
    try {
      const raw = await this.command("0100", 2000);
      scan.pids = labelPids(parsePidBitmap(raw));
    } catch {
      /* */
    }
    try {
      scan.readiness = parseReadiness(await this.command("0101", 2000));
    } catch {
      /* */
    }
    try {
      scan.info.vin = parseVin(await this.command("0902", 4000));
    } catch {
      /* */
    }
    try {
      scan.info.calid = parseMode09Ascii(await this.command("0904", 3000), 0x04);
    } catch {
      /* */
    }
    try {
      scan.info.cvn = parseCvn(await this.command("0906", 2500));
    } catch {
      /* */
    }
    try {
      scan.info.ecuName = parseMode09Ascii(await this.command("090A", 2500), 0x0a);
    } catch {
      /* */
    }
    try {
      scan.stored = parseDtcsSid(await this.command("03", 4000), 0x43);
    } catch {
      /* */
    }
    try {
      scan.pending = parseDtcsSid(await this.command("07", 2500), 0x47);
    } catch {
      /* */
    }
    try {
      scan.permanent = parseDtcsSid(await this.command("0A", 2500), 0x4a);
    } catch {
      /* */
    }
    try {
      scan.mode06 = parseMode06(await this.command("06", 4000));
    } catch {
      /* */
    }
    try {
      const uds = await this.command("3E00", 800);
      if (parseUdsAlive(uds)) scan.udsAlive = ["ECM · Motor"];
    } catch {
      /* */
    }
    if (scan.family === "j1939") {
      try {
        scan.j1939 = parseJ1939Dm1(await this.command("ATDM1", 2500));
      } catch {
        /* */
      }
    }
    return scan;
  }

  async readFreeze(): Promise<{ frame: FreezeFrame; live: boolean; got: number }> {
    const ff = await this.readPidSet(0x42);
    if (ff.got >= 3) return { frame: ff.frame, live: false, got: ff.got };
    const live = await this.readPidSet(0x41);
    return { frame: live.frame, live: true, got: live.got };
  }

  async readOxygen(pass: "wave" | "trims" | "full" = "wave"): Promise<OxygenSample> {
    const sample: OxygenSample = {
      t: Date.now(),
      rpm: null,
      temp: null,
      pre: null,
      post: null,
      pre2: null,
      post2: null,
      stft: null,
      ltft: null,
      lambda: null,
      wideband: false,
    };
    const grab = async (pid: string) => {
      try {
        const raw = await this.command(`01${pid}`, 900);
        if (elmError(raw) === "NO DATA") return null;
        return pidPayload(raw, 0x41, Number.parseInt(pid, 16));
      } catch {
        return null;
      }
    };
    if (pass === "wave" || pass === "trims" || pass === "full") {
      const p14 = await grab("14");
      if (p14) {
        const d = decodeO2Voltage(p14);
        sample.pre = d.v;
        if (d.stft != null) sample.stft = d.stft;
      }
      const p15 = await grab("15");
      if (p15) sample.post = decodeO2Voltage(p15).v;
    }
    if (pass === "trims" || pass === "full") {
      const p06 = await grab("06");
      if (p06) sample.stft = decodeTrimByte(p06[0] ?? 128);
      const p07 = await grab("07");
      if (p07) sample.ltft = decodeTrimByte(p07[0] ?? 128);
    }
    if (sample.pre == null && pass !== "trims") {
      const p24 = await grab("24");
      if (p24 && p24.length >= 2) {
        sample.lambda = decodeLambda(p24);
        sample.wideband = true;
      }
    }
    if (pass === "full") {
      const p16 = await grab("16");
      if (p16) sample.pre2 = decodeO2Voltage(p16).v;
      const p17 = await grab("17");
      if (p17) sample.post2 = decodeO2Voltage(p17).v;
      const p0c = await grab("0C");
      if (p0c) sample.rpm = decodeRpm(p0c);
      const p05 = await grab("05");
      if (p05) sample.temp = decodeTemp(p05);
    }
    return sample;
  }

  private async readPidSet(echo: number): Promise<{ frame: FreezeFrame; got: number }> {
    const mode = echo === 0x42 ? "02" : "01";
    const frame: FreezeFrame = {
      rpm: 0,
      velocidad: 0,
      tempRefrigerante: 0,
      cargaMotor: 0,
      presionMap: 0,
      voltajeBateria: 0,
    };
    let got = 0;
    const grab = async (pid: string, apply: (p: number[]) => void) => {
      try {
        const raw = await this.command(`${mode}${pid}`, 1200);
        const p = pidPayload(raw, echo, Number.parseInt(pid, 16));
        if (!p) return;
        apply(p);
        got += 1;
      } catch {
        /* PID ausente */
      }
    };
    await grab("0C", (p) => {
      frame.rpm = decodeRpm(p);
    });
    await grab("0D", (p) => {
      frame.velocidad = decodeSpeed(p);
    });
    await grab("05", (p) => {
      frame.tempRefrigerante = decodeTemp(p);
    });
    await grab("04", (p) => {
      frame.cargaMotor = decodeLoad(p);
    });
    await grab("0B", (p) => {
      frame.presionMap = decodeMap(p);
    });
    await grab("42", (p) => {
      frame.voltajeBateria = decodeVoltage(p);
    });
    return { frame, got };
  }

  async clearCodes(): Promise<void> {
    const raw = await this.command("04", 4000);
    const err = elmError(raw);
    if (err && err !== "NO DATA") throw new Error(err);
    if (!/44/.test(raw) && err === "NO DATA") {
      throw new Error("El ECM no confirmó el borrado. Motor en ON y vuelve a intentar.");
    }
  }

  async close(): Promise<void> {
    this.aborted = true;
    await this.closeQuiet();
  }

  private async closeQuiet(): Promise<void> {
    this.pumping = false;
    try {
      await this.reader?.cancel();
    } catch {
      /* already released */
    }
    try {
      this.reader?.releaseLock();
    } catch {
      /* already released */
    }
    try {
      this.writer?.releaseLock();
    } catch {
      /* already released */
    }
    this.reader = null;
    this.writer = null;
    this.bleWrite = null;
    try {
      this.bleDevice?.gatt?.disconnect();
    } catch {
      /* already closed */
    }
    this.bleDevice = null;
    try {
      await this.port?.close();
    } catch {
      /* already closed */
    }
    this.port = null;
    this.rx = "";
  }
}

function pickIdentity(raw: string, fallback: string): string {
  const lines = raw
    .split("\n")
    .map((l) => l.replace(/>/g, "").trim())
    .filter(Boolean);
  return lines.find((l) => /ELM|STN|vLinker|Vgate|v\d/i.test(l)) ?? lines.at(-1) ?? fallback;
}

function preview(raw: string): string {
  const t = raw.replace(/\s+/g, " ").trim();
  return t.length > 80 ? `${t.slice(0, 80)}…` : t || "(vacío)";
}

function hexHas(raw: string, a: number, b: number): boolean {
  const hex = raw.replace(/[^0-9A-Fa-f]/g, "");
  const needle = a.toString(16).padStart(2, "0") + b.toString(16).padStart(2, "0");
  return hex.toLowerCase().includes(needle.toLowerCase());
}

function hexVid(n: number): string {
  return n.toString(16).padStart(4, "0");
}

async function findUart(server: BluetoothRemoteGATTServer): Promise<{
  write: BluetoothRemoteGATTCharacteristic;
  notify: BluetoothRemoteGATTCharacteristic;
}> {
  const seen = new Set<BluetoothRemoteGATTCharacteristic>();
  const tryService = async (svc: BluetoothRemoteGATTService) => {
    const chars = await svc.getCharacteristics();
    for (const c of chars) seen.add(c);
  };
  for (const uuid of BLE_SERVICES) {
    try {
      await tryService(await server.getPrimaryService(uuid));
    } catch {
      /* servicio no publicado */
    }
  }
  try {
    for (const svc of await server.getPrimaryServices()) {
      try {
        await tryService(svc);
      } catch {
        /* skip */
      }
    }
  } catch {
    /* Android a veces exige UUIDs en optionalServices */
  }
  const list = [...seen];
  const notify = list.find((c) => c.properties.notify || c.properties.indicate);
  const write = list.find((c) => c.properties.writeWithoutResponse || c.properties.write);
  if (!notify || !write) {
    throw new Error("El Bluetooth no es un UART OBD. El vLinker FS es USB; usa OTG en la Active 5.");
  }
  return { write, notify };
}

let active: Elm327 | null = null;

export function getElm(): Elm327 | null {
  return active;
}

export function setElm(next: Elm327 | null) {
  active = next;
}

