export function stripElmNoise(raw: string): string {
  return raw
    .replace(/\u0000/g, "")
    .replace(/SEARCHING\.\.\./gi, " ")
    .replace(/BUS INIT:?\s*OK/gi, " ")
    .replace(/\r/g, "\n");
}

export function hexBytes(raw: string): number[] {
  const cleaned = stripElmNoise(raw)
    .replace(/>/g, " ")
    .replace(/[^0-9A-Fa-f\s]/g, " ");
  const tokens = cleaned.match(/[0-9A-Fa-f]{2}/g) ?? [];
  return tokens.map((t) => Number.parseInt(t, 16));
}

export function elmError(raw: string): string | null {
  const t = raw.toUpperCase();
  if (t.includes("UNABLE TO CONNECT")) {
    return "Sin enlace con el coche. Ignición en ON y el conector OBD bien asentado.";
  }
  if (t.includes("CAN ERROR")) {
    return "Error de CAN. Revisa tierra, pines 6/14 y que no haya otro escáner en el bus.";
  }
  if (t.includes("BUS INIT") && t.includes("ERROR")) {
    return "El bus no arrancó. Prueba otra vez con el motor en ON.";
  }
  if (t.includes("NO DATA")) return "NO DATA";
  if (t.includes("STOPPED")) return "La trama se cortó. No desconectes el adaptador a media lectura.";
  if (t.includes("BUFFER FULL")) return "Buffer del ELM lleno. Repite el comando.";
  if (t.includes("BUS BUSY")) return "Bus ocupado. Espera un segundo y reintenta.";
  if (/\bERR\b/.test(t) || t.includes("ERROR")) {
    return "El adaptador respondió error. Reconecta el USB y repite ATZ.";
  }
  if (t.includes("?")) return "Comando no reconocido por este clon de ELM.";
  return null;
}

export function dtcFromBytes(a: number, b: number): string | null {
  if (a === 0 && b === 0) return null;
  const prefix = ["P", "C", "B", "U"][(a >> 6) & 0x3] ?? "P";
  const n1 = ((a >> 4) & 0x3).toString(10);
  const rest = (((a & 0x0f) << 8) | b).toString(16).toUpperCase().padStart(3, "0");
  return `${prefix}${n1}${rest}`;
}

export function parseDtcs(raw: string): string[] {
  const bytes = hexBytes(raw);
  const codes: string[] = [];
  let i = 0;
  while (i < bytes.length) {
    const sid = bytes[i];
    if (sid !== 0x43 && sid !== 0x47) {
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
      if (bytes[i] === 0x43 || bytes[i] === 0x47) break;
      const code = dtcFromBytes(bytes[i] ?? 0, bytes[i + 1] ?? 0);
      if (code) codes.push(code);
      i += 2;
    }
  }
  return [...new Set(codes)];
}

export function parseMil(raw: string): { mil: boolean; count: number } | null {
  const bytes = hexBytes(raw);
  for (let i = 0; i + 2 < bytes.length; i++) {
    if (bytes[i] === 0x41 && bytes[i + 1] === 0x01) {
      const a = bytes[i + 2] ?? 0;
      return { mil: (a & 0x80) !== 0, count: a & 0x7f };
    }
  }
  return null;
}

export function pidPayload(raw: string, modeEcho: number, pid: number): number[] | null {
  const bytes = hexBytes(raw);
  for (let i = 0; i + 1 < bytes.length; i++) {
    if (bytes[i] === modeEcho && bytes[i + 1] === pid) {
      return bytes.slice(i + 2, i + 6);
    }
  }
  return null;
}

export function decodeRpm(p: number[]): number {
  return Math.round((((p[0] ?? 0) << 8) + (p[1] ?? 0)) / 4);
}
export function decodeSpeed(p: number[]): number {
  return p[0] ?? 0;
}
export function decodeTemp(p: number[]): number {
  return (p[0] ?? 0) - 40;
}
export function decodeLoad(p: number[]): number {
  return Math.round(((p[0] ?? 0) * 1000) / 255) / 10;
}
export function decodeMap(p: number[]): number {
  return p[0] ?? 0;
}
export function decodeVoltage(p: number[]): number {
  return Math.round((((p[0] ?? 0) << 8) + (p[1] ?? 0)) / 10) / 100;
}

export function parseVin(raw: string): string {
  const bytes = hexBytes(raw);
  const ascii: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x49 && bytes[i + 1] === 0x02) {
      const rest = (bytes[i + 2] ?? 0) <= 0x08 ? bytes.slice(i + 3) : bytes.slice(i + 2);
      for (const b of rest) {
        if (b >= 0x30 && b <= 0x5a) ascii.push(b);
      }
      i += 2;
    }
  }
  const vin = String.fromCharCode(...ascii).replace(/[^A-HJ-NPR-Z0-9]/g, "");
  if (vin.length >= 17) return vin.slice(0, 17);
  if (vin.length >= 11) return vin;
  return "";
}

export function parseProtocol(raw: string): string {
  const line = stripElmNoise(raw).replace(/>/g, "").trim();
  const first =
    line
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .at(-1) ?? "";
  return first || "ISO 15765-4 CAN";
}

export function looksLikeElm(raw: string): boolean {
  return /ELM|STN|OBD|v\d\.\d|OK|>/i.test(raw);
}
