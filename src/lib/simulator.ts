import type { DtcEntry, Severidad } from "@/lib/wiki";
import { lookupDtc } from "@/lib/wiki";

export type Fuel = "gasolina" | "diesel";

export type ModuleStatus = "ok" | "timeout" | "error";

export type VehicleModule = {
  id: string;
  name: string;
  protocol: string;
  status: ModuleStatus;
  latencyMs: number;
};

export type FreezeFrame = {
  rpm: number;
  velocidad: number;
  tempRefrigerante: number;
  cargaMotor: number;
  presionMap: number;
  voltajeBateria: number;
};

export type ScanProfile = {
  id: string;
  label: string;
  marca: string;
  modelo: string;
  anio: number;
  motor: Fuel;
  vin: string;
  placas: string;
  km: number;
  mil: boolean;
  codes: string[];
  linkMs: number;
  protocol: string;
  freeze: FreezeFrame;
  modules: VehicleModule[];
};

const ECM_OK = (ms: number): VehicleModule => ({
  id: "ecm",
  name: "ECM · Motor",
  protocol: "ISO 15765-4 CAN 11/500",
  status: "ok",
  latencyMs: ms,
});

export const PROFILES: ScanProfile[] = [
  {
    id: "np300-misfire",
    label: "NP300 · falla de encendido",
    marca: "Nissan",
    modelo: "NP300",
    anio: 2020,
    motor: "gasolina",
    vin: "3N6AD36A5LK204918",
    placas: "JTA-78-04",
    km: 142380,
    mil: true,
    codes: ["P0300"],
    linkMs: 12,
    protocol: "ISO 15765-4 CAN 11/500",
    freeze: {
      rpm: 2450,
      velocidad: 62,
      tempRefrigerante: 96,
      cargaMotor: 68.4,
      presionMap: 142,
      voltajeBateria: 14.1,
    },
    modules: [
      ECM_OK(12),
      {
        id: "tcm",
        name: "TCM · Transmisión",
        protocol: "ISO 15765-4 CAN 11/500",
        status: "ok",
        latencyMs: 18,
      },
      {
        id: "abs",
        name: "ABS / ESC",
        protocol: "ISO 15765-4 CAN 11/500",
        status: "ok",
        latencyMs: 22,
      },
      {
        id: "srs",
        name: "Airbag / SRS",
        protocol: "ISO 15765-4 CAN 11/500",
        status: "ok",
        latencyMs: 31,
      },
      {
        id: "bcm",
        name: "BCM · Carrocería",
        protocol: "ISO 14229 UDS",
        status: "ok",
        latencyMs: 27,
      },
      {
        id: "cluster",
        name: "Cluster",
        protocol: "ISO 15765-4 CAN 11/500",
        status: "ok",
        latencyMs: 19,
      },
    ],
  },
  {
    id: "sentra-lean",
    label: "Sentra · mezcla pobre + EVAP",
    marca: "Nissan",
    modelo: "Sentra",
    anio: 2018,
    motor: "gasolina",
    vin: "3N1AB7AP5JY320441",
    placas: "SLP-12-19",
    km: 98640,
    mil: true,
    codes: ["P0171", "P0442"],
    linkMs: 15,
    protocol: "ISO 15765-4 CAN 11/500",
    freeze: {
      rpm: 1880,
      velocidad: 41,
      tempRefrigerante: 91,
      cargaMotor: 44.2,
      presionMap: 38,
      voltajeBateria: 13.8,
    },
    modules: [
      ECM_OK(15),
      {
        id: "tcm",
        name: "CVT · Transmisión",
        protocol: "ISO 15765-4 CAN 11/500",
        status: "ok",
        latencyMs: 24,
      },
      {
        id: "abs",
        name: "ABS",
        protocol: "ISO 15765-4 CAN 11/500",
        status: "ok",
        latencyMs: 20,
      },
      {
        id: "srs",
        name: "Airbag / SRS",
        protocol: "ISO 15765-4 CAN 11/500",
        status: "timeout",
        latencyMs: 0,
      },
      {
        id: "bcm",
        name: "BCM · Carrocería",
        protocol: "ISO 14229 UDS",
        status: "ok",
        latencyMs: 29,
      },
      {
        id: "cluster",
        name: "Cluster",
        protocol: "ISO 15765-4 CAN 11/500",
        status: "ok",
        latencyMs: 16,
      },
    ],
  },
  {
    id: "silverado-dpf",
    label: "Silverado · DPF saturado",
    marca: "Chevrolet",
    modelo: "Silverado 2500",
    anio: 2019,
    motor: "diesel",
    vin: "1GC4K0EY5KF148203",
    placas: "DGO-44-21",
    km: 211090,
    mil: true,
    codes: ["P2002", "P0299"],
    linkMs: 18,
    protocol: "ISO 15765-4 CAN 11/500",
    freeze: {
      rpm: 1620,
      velocidad: 78,
      tempRefrigerante: 88,
      cargaMotor: 72.1,
      presionMap: 168,
      voltajeBateria: 13.9,
    },
    modules: [
      ECM_OK(18),
      {
        id: "tcm",
        name: "Allison · Transmisión",
        protocol: "ISO 15765-4 CAN 11/500",
        status: "ok",
        latencyMs: 21,
      },
      {
        id: "abs",
        name: "ABS / Trailer",
        protocol: "ISO 15765-4 CAN 11/500",
        status: "ok",
        latencyMs: 26,
      },
      {
        id: "srs",
        name: "Airbag / SRS",
        protocol: "ISO 15765-4 CAN 11/500",
        status: "ok",
        latencyMs: 33,
      },
      {
        id: "bcm",
        name: "BCM",
        protocol: "ISO 14229 UDS",
        status: "ok",
        latencyMs: 24,
      },
      {
        id: "cluster",
        name: "Cluster",
        protocol: "J1939 / CAN",
        status: "error",
        latencyMs: 0,
      },
    ],
  },
  {
    id: "clean-march",
    label: "March · sin códigos",
    marca: "Nissan",
    modelo: "March",
    anio: 2022,
    motor: "gasolina",
    vin: "3N1CK3CD8NL205773",
    placas: "AGS-09-33",
    km: 41220,
    mil: false,
    codes: [],
    linkMs: 9,
    protocol: "ISO 15765-4 CAN 11/500",
    freeze: {
      rpm: 780,
      velocidad: 0,
      tempRefrigerante: 89,
      cargaMotor: 18.0,
      presionMap: 32,
      voltajeBateria: 14.2,
    },
    modules: [
      ECM_OK(9),
      {
        id: "tcm",
        name: "TCM · Transmisión",
        protocol: "ISO 15765-4 CAN 11/500",
        status: "ok",
        latencyMs: 14,
      },
      {
        id: "abs",
        name: "ABS",
        protocol: "ISO 15765-4 CAN 11/500",
        status: "ok",
        latencyMs: 17,
      },
      {
        id: "srs",
        name: "Airbag / SRS",
        protocol: "ISO 15765-4 CAN 11/500",
        status: "ok",
        latencyMs: 20,
      },
      {
        id: "bcm",
        name: "BCM · Carrocería",
        protocol: "ISO 14229 UDS",
        status: "ok",
        latencyMs: 15,
      },
      {
        id: "cluster",
        name: "Cluster",
        protocol: "ISO 15765-4 CAN 11/500",
        status: "ok",
        latencyMs: 11,
      },
    ],
  },
];

export function profileById(id: string): ScanProfile {
  return PROFILES.find((p) => p.id === id) ?? PROFILES[0];
}

export function findingsFor(profile: ScanProfile): DtcEntry[] {
  return profile.codes.map(lookupDtc);
}

export function worstSeverity(codes: string[]): Severidad | "none" {
  if (codes.length === 0) return "none";
  const ranks: Record<Severidad, number> = { ok: 1, warn: 2, bad: 3 };
  let worst: Severidad = "ok";
  for (const c of codes) {
    const s = lookupDtc(c).severidad;
    if (ranks[s] > ranks[worst]) worst = s;
  }
  return worst;
}

export const LINK_STEPS = [
  {
    id: "wake",
    title: "Despertando adaptador",
    detail: "ATZ · ATE0 · ATL0",
  },
  {
    id: "proto",
    title: "Configurando protocolo",
    detail: "Ajustando velocidad y trama con el vehículo",
  },
  {
    id: "verify",
    title: "Verificando enlace",
    detail: "Ping a módulos · 0100 · 0902",
  },
] as const;
