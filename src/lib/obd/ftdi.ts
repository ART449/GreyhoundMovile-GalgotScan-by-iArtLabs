/** FTDI (vLinker FS) over WebUSB — Android Chrome has no Web Serial. */

export const FTDI_VID = 0x0403;

const H_SERIES = new Set([0x6010, 0x6011, 0x6014]);

export function encodeFtdiBaud(
  baudRate: number,
  baudRateWithPort = false,
  portNumber = 0,
): { value: number; index: number } {
  let divisor: number;
  let subdivisor: number;
  if (baudRate >= 2_500_000) {
    divisor = 0;
    subdivisor = 0;
  } else if (baudRate >= 1_750_000) {
    divisor = 1;
    subdivisor = 0;
  } else {
    divisor = (24_000_000 << 1) / baudRate;
    divisor = (divisor + 1) >> 1;
    subdivisor = divisor & 0x07;
    divisor >>= 3;
  }
  let value = divisor;
  let index = 0;
  switch (subdivisor) {
    case 4:
      value |= 0x4000;
      break;
    case 2:
      value |= 0x8000;
      break;
    case 1:
      value |= 0xc000;
      break;
    case 3:
      index |= 1;
      break;
    case 5:
      value |= 0x4000;
      index |= 1;
      break;
    case 6:
      value |= 0x8000;
      index |= 1;
      break;
    case 7:
      value |= 0xc000;
      index |= 1;
      break;
    default:
      break;
  }
  if (baudRateWithPort) {
    index = (index << 8) | (portNumber + 1);
  }
  return { value: value & 0xffff, index: index & 0xffff };
}

export function stripFtdiStatus(data: Uint8Array, packetSize: number): Uint8Array {
  const size = Math.max(packetSize, 2);
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (let i = 0; i < data.length; i += size) {
    const end = Math.min(i + size, data.length);
    if (end - i <= 2) continue;
    const part = data.subarray(i + 2, end);
    chunks.push(part);
    total += part.length;
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

export function isFtdiDevice(device: { vendorId: number }): boolean {
  return device.vendorId === FTDI_VID;
}

/**
 * Duck-typed SerialPort for Elm327.openWithBaud.
 * Speaks FT232/FT231X vendor requests — not CDC-ACM.
 */
export class FtdiUsbPort {
  readable: ReadableStream<Uint8Array> | null = null;
  writable: WritableStream<Uint8Array> | null = null;
  private device: USBDevice;
  private iface = 0;
  private inEp = 1;
  private outEp = 2;
  private packetSize = 64;
  private closed = true;
  private baudRateWithPort: boolean;

  constructor(device: USBDevice) {
    this.device = device;
    this.baudRateWithPort = H_SERIES.has(device.productId);
  }

  getInfo(): { usbVendorId: number; usbProductId: number } {
    return { usbVendorId: this.device.vendorId, usbProductId: this.device.productId };
  }

  async open(options: { baudRate: number }): Promise<void> {
    if (!this.device.opened) await this.device.open();
    if (this.device.configuration == null) await this.device.selectConfiguration(1);
    const iface = this.device.configuration?.interfaces[0];
    if (!iface) throw new Error("El vLinker no expuso interfaz USB.");
    this.iface = iface.interfaceNumber;
    try {
      if (!iface.claimed) await this.device.claimInterface(this.iface);
    } catch {
      throw new Error(
        "El USB está ocupado. Cierra Serial USB Terminal u otra app, usa Chrome (no el visor) y reintenta.",
      );
    }
    const alt = iface.alternates[0];
    const bulkIn = alt?.endpoints.find((e) => e.direction === "in" && e.type === "bulk");
    const bulkOut = alt?.endpoints.find((e) => e.direction === "out" && e.type === "bulk");
    if (!bulkIn || !bulkOut) {
      throw new Error("El adaptador USB no tiene extremos serie. ¿Es el vLinker FS?");
    }
    this.inEp = bulkIn.endpointNumber;
    this.outEp = bulkOut.endpointNumber;
    this.packetSize = bulkIn.packetSize || 64;

    const portIndex = this.iface + 1;
    await this.vendorOut(0, 0, portIndex);
    await this.vendorOut(9, 1, portIndex);
    const baud = encodeFtdiBaud(options.baudRate, this.baudRateWithPort, this.iface);
    await this.vendorOut(3, baud.value, baud.index);
    await this.vendorOut(4, 8, portIndex);
    await this.vendorOut(1, 0x0303, portIndex);
    await this.vendorOut(2, 0, portIndex);

    this.closed = false;
    this.readable = new ReadableStream<Uint8Array>({
      pull: async (controller) => {
        if (this.closed) {
          controller.close();
          return;
        }
        try {
          const result = await this.device.transferIn(this.inEp, this.packetSize * 4);
          if (this.closed) {
            controller.close();
            return;
          }
          if (result.status === "stall") {
            await this.device.clearHalt("in", this.inEp);
            return;
          }
          const view = result.data;
          if (!view || view.byteLength === 0) return;
          const raw = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
          const data = stripFtdiStatus(raw, this.packetSize);
          if (data.length > 0) controller.enqueue(data);
        } catch (err) {
          if (!this.closed) controller.error(err);
        }
      },
      cancel: () => {
        this.closed = true;
      },
    });
    this.writable = new WritableStream<Uint8Array>({
      write: async (chunk) => {
        const copy = new Uint8Array(chunk.byteLength);
        copy.set(chunk);
        const result = await this.device.transferOut(this.outEp, copy);
        if (result.status !== "ok") throw new Error("No se pudo escribir al vLinker.");
      },
    });
  }

  async setSignals(signals: { dataTerminalReady?: boolean; requestToSend?: boolean }): Promise<void> {
    let value = 0;
    if (signals.dataTerminalReady) value |= 0x0101;
    else if (signals.dataTerminalReady === false) value |= 0x0100;
    if (signals.requestToSend) value |= 0x0202;
    else if (signals.requestToSend === false) value |= 0x0200;
    if (value) await this.vendorOut(1, value, this.iface + 1);
  }

  async close(): Promise<void> {
    this.closed = true;
    this.readable = null;
    this.writable = null;
    try {
      if (this.device.opened) {
        try {
          await this.device.releaseInterface(this.iface);
        } catch {
          /* already released */
        }
        await this.device.close();
      }
    } catch {
      /* already closed */
    }
  }

  private async vendorOut(request: number, value: number, index: number): Promise<void> {
    const result = await this.device.controlTransferOut({
      requestType: "vendor",
      recipient: "device",
      request,
      value,
      index,
    });
    if (result.status !== "ok") {
      throw new Error("El vLinker no aceptó la configuración USB.");
    }
  }
}
