import { MID_LABELS, PID_LABELS, familyFromName, type ProtocolFamily } from "@/lib/obd/protocols";
import { dtcFromBytes, hexBytes, parseDtcs, parseVin } from "@/lib/obd/parse";

export type ReadinessMonitor = {
  id: string;
  name: string;
  available: boolean;
  complete: boolean;
};

export type Mode06Test = {
  mid: string;
  name: string;
  tid: string;
  value: number;
  limit: number;
  pass: boolean;
};

export type VehicleInfo = {
  vin: string;
  calid: string;
  cvn: string;
  ecuName: string;
};

export type AdvancedScan = {
  protocolName: string;
  protocolCode: string;
  family: ProtocolFamily;
  pids: string[];
  readiness: ReadinessMonitor[];
  info: VehicleInfo;
  stored: string[];
  pending: string[];
  permanent: string[];
  mode06: Mode06Test[];
  udsAlive: string[];
  j1939: string[];
};

export function parsePidBitmap(raw: string, base = 0): number[] {
  const bytes = hexBytes(raw);
  const out: number[] = [];
  for (let i = 0; i + 5 < bytes.length; i++) {
    if (bytes[i] !== 0x41) continue;
    const pid = bytes[i + 1] ?? 0;
    if (pid !== base && pid !== 0x00 && pid !== 0x20 && pid !== 0x40 && pid !== 0x60 && pid !== 0x80) {
      continue;
    }
    const start = pid === 0 ? 0 : pid;
    const chunk = bytes.slice(i + 2, i + 6);
    let acc = 0;
    for (const b of chunk) acc = (acc << 8) | b;
    for (let bit = 0; bit < 32; bit++) {
      const mask = 1 << (31 - bit);
      if (acc & mask) out.push(start + bit + 1);
    }
  }
  return [...new Set(out)];
}

export function labelPids(pids: number[]): string[] {
  return pids
    .filter((p) => p <= 0xc0)
    .map((p) => {
      const hex = p.toString(16).toUpperCase().padStart(2, "0");
      const name = PID_LABELS[p];
      return name ? `${hex} · ${name}` : hex;
    });
}

export function parseReadiness(raw: string): ReadinessMonitor[] {
  const bytes = hexBytes(raw);
  let a = 0;
  let b = 0;
  let c = 0;
  let d = 0;
  let found = false;
  for (let i = 0; i + 5 < bytes.length; i++) {
    if (bytes[i] === 0x41 && bytes[i + 1] === 0x01) {
      a = bytes[i + 2] ?? 0;
      b = bytes[i + 3] ?? 0;
      c = bytes[i + 4] ?? 0;
      d = bytes[i + 5] ?? 0;
      found = true;
      break;
    }
  }
  if (!found) return [];
  const compression = (b & 0x08) !== 0;
  const spark: [string, string, number][] = [
    ["misfire", "Falla de encendido", 0],
    ["fuel", "Sistema de combustible", 1],
    ["ccm", "Componentes integrales", 2],
    ["cat", "Catalizador", 0],
    ["hcat", "Calentador de catalizador", 1],
    ["evap", "EVAP", 2],
    ["air", "Aire secundario", 3],
    ["o2", "Sensor O2", 5],
    ["htr", "Calentador O2", 6],
    ["egr", "EGR / VVT", 7],
  ];
  const diesel: [string, string, number][] = [
    ["misfire", "Falla de encendido", 0],
    ["fuel", "Sistema de combustible", 1],
    ["ccm", "Componentes integrales", 2],
    ["nmhc", "Catalizador NMHC", 0],
    ["nox", "NOx / SCR", 1],
    ["boost", "Boost / turbo", 2],
    ["egr", "EGR", 3],
    ["pm", "Filtro DPF", 4],
    ["egas", "Sensor de gases", 5],
  ];
  const table = compression ? diesel : spark;
  return table.map(([id, name, bit], idx) => {
    if (idx < 3) {
      return {
        id,
        name,
        available: (b & (1 << bit)) !== 0,
        complete: (b & (1 << (bit + 4))) === 0,
      };
    }
    return {
      id,
      name,
      available: (c & (1 << bit)) !== 0,
      complete: (d & (1 << bit)) === 0,
    };
  });
}

export function parseMode09Ascii(raw: string, pid: number): string {
  const bytes = hexBytes(raw);
  const ascii: number[] = [];
  for (let i = 0; i + 2 < bytes.length; i++) {
    if (bytes[i] === 0x49 && bytes[i + 1] === pid) {
      const seq = bytes[i + 2] ?? 0;
      const rest = seq <= 0x10 ? bytes.slice(i + 3) : bytes.slice(i + 2);
      for (const b of rest) {
        if (b >= 0x20 && b <= 0x7e) ascii.push(b);
      }
    }
  }
  return String.fromCharCode(...ascii).replace(/\s+/g, " ").trim();
}

export function parseCvn(raw: string): string {
  const bytes = hexBytes(raw);
  for (let i = 0; i + 3 < bytes.length; i++) {
    if (bytes[i] === 0x49 && bytes[i + 1] === 0x06) {
      const seq = bytes[i + 2] ?? 0;
      const payload = seq <= 0x10 ? bytes.slice(i + 3, i + 7) : bytes.slice(i + 2, i + 6);
      return payload
        .map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
        .join("");
    }
  }
  return "";
}

export function parseDtcsSid(raw: string, sid: number): string[] {
  if (sid === 0x43 || sid === 0x47) return parseDtcs(raw);
  const bytes = hexBytes(raw);
  const codes: string[] = [];
  let i = 0;
  while (i < bytes.length) {
    if (bytes[i] !== sid) {
      i += 1;
      continue;
    }
    const rest = bytes.length - i - 1;
    const count = bytes[i + 1];
    if (count !== undefined && count <= 16 && rest === count * 2 + 1) {
      i += 2;
      for (let n = 0; n < count && i + 1 < bytes.length; n += 1, i += 2) {
        const code = dtcFromBytes(bytes[i] ?? 0, bytes[i + 1] ?? 0);
        if (code) codes.push(code);
      }
      continue;
    }
    i += 1;
    while (i + 1 < bytes.length) {
      if (bytes[i] === sid) break;
      const code = dtcFromBytes(bytes[i] ?? 0, bytes[i + 1] ?? 0);
      if (code) codes.push(code);
      i += 2;
    }
  }
  return [...new Set(codes)];
}

export function parseMode06(raw: string): Mode06Test[] {
  const bytes = hexBytes(raw);
  const tests: Mode06Test[] = [];
  for (let i = 0; i + 6 < bytes.length; i++) {
    if (bytes[i] !== 0x46) continue;
    const mid = bytes[i + 1] ?? 0;
    const tid = bytes[i + 2] ?? 0;
    if (mid === 0) continue;
    const value = ((bytes[i + 3] ?? 0) << 8) | (bytes[i + 4] ?? 0);
    const limit = ((bytes[i + 5] ?? 0) << 8) | (bytes[i + 6] ?? 0);
    const pass = limit === 0 ? value === 0 : value <= limit;
    tests.push({
      mid: mid.toString(16).toUpperCase().padStart(2, "0"),
      name: MID_LABELS[mid] ?? `Monitor ${mid.toString(16).toUpperCase()}`,
      tid: tid.toString(16).toUpperCase().padStart(2, "0"),
      value,
      limit,
      pass,
    });
    i += 6;
  }
  return tests.slice(0, 24);
}

export function parseUdsAlive(raw: string): boolean {
  const t = raw.replace(/\s+/g, "").toUpperCase();
  return t.includes("7E00") || t.includes("7E") || /7E[0-9A-F]{2}/.test(t);
}

export function parseJ1939Dm1(raw: string): string[] {
  const bytes = hexBytes(raw);
  const out: string[] = [];
  for (let i = 0; i + 3 < bytes.length; i++) {
    const spn = (bytes[i] ?? 0) | ((bytes[i + 1] ?? 0) << 8) | (((bytes[i + 2] ?? 0) & 0xe0) << 11);
    const fmi = (bytes[i + 2] ?? 0) & 0x1f;
    if (spn > 0 && spn < 524288 && fmi <= 31) {
      out.push(`SPN ${spn} FMI ${fmi}`);
      i += 3;
    }
  }
  return [...new Set(out)].slice(0, 12);
}

export function parseAtDpn(raw: string): string {
  const t = raw.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
  if (!t) return "";
  const last = t.slice(-2);
  return last.startsWith("A") && last.length === 2 ? last.slice(1) : last.slice(-1);
}

export function emptyAdvanced(protocolName = ""): AdvancedScan {
  return {
    protocolName,
    protocolCode: "",
    family: familyFromName(protocolName),
    pids: [],
    readiness: [],
    info: { vin: "", calid: "", cvn: "", ecuName: "" },
    stored: [],
    pending: [],
    permanent: [],
    mode06: [],
    udsAlive: [],
    j1939: [],
  };
}

export function sampleAdvanced(opts: {
  protocol: string;
  vin: string;
  codes: string[];
  motor: "gasolina" | "diesel";
}): AdvancedScan {
  const misfire = opts.codes.includes("P0300");
  return {
    protocolName: opts.protocol,
    protocolCode: "6",
    family: familyFromName(opts.protocol),
    pids: labelPids([1, 3, 4, 5, 11, 12, 13, 15, 16, 17, 28, 31, 33, 66]),
    readiness: parseReadiness(misfire ? "41 01 81 0E 65 05" : "41 01 00 07 65 00"),
    info: {
      vin: opts.vin,
      calid: "23710-4KL0A",
      cvn: "A31C90E2",
      ecuName: "ECM-EngineControl",
    },
    stored: opts.codes,
    pending: misfire ? ["P0300"] : [],
    permanent: misfire ? ["P0300"] : [],
    mode06: misfire
      ? [
          {
            mid: "A2",
            name: "Falla de encendido cil. 1",
            tid: "0B",
            value: 42,
            limit: 20,
            pass: false,
          },
          {
            mid: "01",
            name: "O2 banco 1 sensor 1",
            tid: "01",
            value: 64,
            limit: 128,
            pass: true,
          },
        ]
      : [
          {
            mid: "01",
            name: "O2 banco 1 sensor 1",
            tid: "01",
            value: 80,
            limit: 128,
            pass: true,
          },
        ],
    udsAlive: ["ECM · Motor", "TCM · Transmisión"],
    j1939: opts.motor === "diesel" ? ["SPN 3251 FMI 0"] : [],
  };
}
