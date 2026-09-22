export type ProtocolFamily =
  | "auto"
  | "can11"
  | "can29"
  | "kwp"
  | "iso9141"
  | "j1850pwm"
  | "j1850vpw"
  | "j1939"
  | "unknown";

export type ProtocolSpec = {
  id: string;
  elm: string;
  code: string;
  family: ProtocolFamily;
  name: string;
  baud: string;
  pins: string;
  flota: string;
  paraQue: string;
};

export const PROTOCOL_ATLAS: ProtocolSpec[] = [
  {
    id: "auto",
    elm: "ATSP0",
    code: "0",
    family: "auto",
    name: "Auto (ELM busca)",
    baud: "según el bus",
    pins: "6/14 CAN · 7/15 K · 2/10 J1850",
    flota: "Cualquier OBD2 1996+",
    paraQue: "El adaptador prueba capas hasta que el ECM contesta 0100.",
  },
  {
    id: "pwm",
    elm: "ATSP1",
    code: "1",
    family: "j1850pwm",
    name: "SAE J1850 PWM",
    baud: "41.6 kbps",
    pins: "2 PWM · 10 tierra",
    flota: "Ford / Lincoln / Mercury hasta ~2008",
    paraQue: "PWM 41.6. Si el NP300 no es Ford viejo, no lo uses a mano.",
  },
  {
    id: "vpw",
    elm: "ATSP2",
    code: "2",
    family: "j1850vpw",
    name: "SAE J1850 VPW",
    baud: "10.4 kbps",
    pins: "2 VPW",
    flota: "GM / Chevrolet / Pontiac hasta ~2008",
    paraQue: "Variable pulse width. Silverado viejo a veces sigue aquí.",
  },
  {
    id: "iso9141",
    elm: "ATSP3",
    code: "3",
    family: "iso9141",
    name: "ISO 9141-2",
    baud: "10.4 kbps · init 5 baud",
    pins: "7 K-line · 15 L-line",
    flota: "Asiáticos y europeos 96-03",
    paraQue: "Init lento. El ELM tarda; no desconectes a media BUS INIT.",
  },
  {
    id: "kwp5",
    elm: "ATSP4",
    code: "4",
    family: "kwp",
    name: "ISO 14230-4 KWP 5 baud",
    baud: "10.4 kbps · init 5 baud",
    pins: "7 K-line",
    flota: "KWP2000 clásico",
    paraQue: "Misma K-line que 9141, init SAE. Taller: si Auto falla, prueba este.",
  },
  {
    id: "kwpfast",
    elm: "ATSP5",
    code: "5",
    family: "kwp",
    name: "ISO 14230-4 KWP fast",
    baud: "10.4 kbps · fast init",
    pins: "7 K-line",
    flota: "Nissan / Honda / VW 98-06",
    paraQue: "StartCommunication rápido. Sentra / March viejos a veces.",
  },
  {
    id: "can11-500",
    elm: "ATSP6",
    code: "6",
    family: "can11",
    name: "ISO 15765-4 CAN 11/500",
    baud: "500 kbps · 11 bit",
    pins: "6 CAN-H · 14 CAN-L",
    flota: "Casi todo 2008+ · NP300, Sentra, Versa",
    paraQue: "El de piso. IDs 7E0 ECM, 7E1 TCM, 7DF broadcast.",
  },
  {
    id: "can29-500",
    elm: "ATSP7",
    code: "7",
    family: "can29",
    name: "ISO 15765-4 CAN 29/500",
    baud: "500 kbps · 29 bit",
    pins: "6 / 14",
    flota: "Algunos USA / diesel",
    paraQue: "29 bit. Header 18DB33F1. Si 11 bit no enlaza, este es el siguiente.",
  },
  {
    id: "can11-250",
    elm: "ATSP8",
    code: "8",
    family: "can11",
    name: "ISO 15765-4 CAN 11/250",
    baud: "250 kbps · 11 bit",
    pins: "6 / 14",
    flota: "Algunos europeos y cuerpos",
    paraQue: "Mismo CAN, más lento. BCM a veces vive a 250.",
  },
  {
    id: "can29-250",
    elm: "ATSP9",
    code: "9",
    family: "can29",
    name: "ISO 15765-4 CAN 29/250",
    baud: "250 kbps · 29 bit",
    pins: "6 / 14",
    flota: "Mixto / flota",
    paraQue: "29 bit a 250. Poco frecuente en bahía ligera.",
  },
  {
    id: "j1939",
    elm: "ATSPA",
    code: "A",
    family: "j1939",
    name: "SAE J1939",
    baud: "250 kbps · 29 bit",
    pins: "C / D Deutsch 9 · 6/14 en algunos",
    flota: "Diésel pesado · Silverado HD, Cummins, PACCAR",
    paraQue: "PGN, no modo 03. DM1 es el Check Engine del tráiler. El ELM clon barato a menudo no lo trae.",
  },
];

export const HUNT_ORDER: { elm: string; name: string; timeout: number }[] = [
  { elm: "ATSP0", name: "Auto", timeout: 10000 },
  { elm: "ATSP6", name: "CAN 11/500", timeout: 4000 },
  { elm: "ATSP8", name: "CAN 11/250", timeout: 3500 },
  { elm: "ATSP7", name: "CAN 29/500", timeout: 3500 },
  { elm: "ATSP9", name: "CAN 29/250", timeout: 3000 },
  { elm: "ATSP5", name: "KWP fast", timeout: 4000 },
  { elm: "ATSP3", name: "ISO 9141-2", timeout: 5000 },
  { elm: "ATSP4", name: "KWP 5 baud", timeout: 5000 },
  { elm: "ATSP1", name: "J1850 PWM", timeout: 3000 },
  { elm: "ATSP2", name: "J1850 VPW", timeout: 3000 },
  { elm: "ATSPA", name: "J1939", timeout: 3000 },
];

export function familyFromName(name: string): ProtocolFamily {
  const t = name.toUpperCase();
  if (t.includes("J1939")) return "j1939";
  if (t.includes("PWM")) return "j1850pwm";
  if (t.includes("VPW")) return "j1850vpw";
  if (t.includes("9141")) return "iso9141";
  if (t.includes("14230") || t.includes("KWP")) return "kwp";
  if (t.includes("29")) return "can29";
  if (t.includes("CAN") || t.includes("15765")) return "can11";
  if (t.includes("AUTO")) return "auto";
  return "unknown";
}

export function specByElm(elm: string): ProtocolSpec | undefined {
  return PROTOCOL_ATLAS.find((p) => p.elm === elm.toUpperCase());
}

export const PID_LABELS: Record<number, string> = {
  0x00: "PIDs 01-20",
  0x01: "Estado MIL / tests",
  0x03: "Combustible",
  0x04: "Carga de motor",
  0x05: "Temp. refrigerante",
  0x06: "Trim combustible B1 ST",
  0x07: "Trim combustible B1 LT",
  0x0b: "MAP",
  0x0c: "RPM",
  0x0d: "Velocidad",
  0x0e: "Avance de encendido",
  0x0f: "Temp. admisión",
  0x10: "MAF",
  0x11: "Acelerador",
  0x13: "O2 presentes",
  0x14: "O2 B1S1",
  0x15: "O2 B1S2",
  0x1c: "Norma OBD",
  0x1f: "Tiempo desde arranque",
  0x20: "PIDs 21-40",
  0x21: "Distancia con MIL",
  0x2e: "Evap purge",
  0x2f: "Nivel de tanque",
  0x31: "Distancia desde borrado",
  0x33: "Barométrica",
  0x42: "Voltaje módulo",
  0x45: "Relativo acelerador",
  0x46: "Temp. ambiente",
  0x4d: "Minutos con MIL",
  0x51: "Tipo de combustible",
  0xa4: "Calibración transmisión",
  0xa6: "Odómetro",
};

export const MID_LABELS: Record<number, string> = {
  0x01: "O2 banco 1 sensor 1",
  0x02: "O2 banco 1 sensor 2",
  0x05: "O2 banco 2 sensor 1",
  0x06: "O2 banco 2 sensor 2",
  0x21: "Catalizador banco 1",
  0x22: "Catalizador banco 2",
  0x31: "EGR",
  0x35: "VVT / distribución",
  0x3c: "VVT banco 1",
  0x39: "Evap 0.020",
  0x3b: "Evap 0.040",
  0x3d: "Purge flow",
  0x41: "Calentador O2 B1S1",
  0x42: "Calentador O2 B1S2",
  0xa2: "Falla de encendido cil. 1",
  0xa3: "Falla de encendido cil. 2",
  0xa4: "Falla de encendido cil. 3",
  0xa5: "Falla de encendido cil. 4",
  0xa6: "Falla de encendido cil. 5",
  0xa7: "Falla de encendido cil. 6",
};
