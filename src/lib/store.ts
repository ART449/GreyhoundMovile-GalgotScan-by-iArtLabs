import { create } from "zustand";
import { getElm, setElm, spanishSerialError } from "@/lib/obd/elm327";
import type { LiveScan } from "@/lib/obd/elm327";
import { sampleAdvanced, type AdvancedScan } from "@/lib/obd/advanced";
import { profileById, type Fuel, type FreezeFrame, type ScanProfile, type VehicleModule } from "@/lib/simulator";

export type LinkMode = "usb" | "ble" | "sim";
export type SessionStatus = "idle" | "linking" | "linked";

export type WorkOrder = {
  id: string;
  fecha: number;
  marca: string;
  modelo: string;
  anio: number;
  placas: string;
  vin: string;
  km: number;
  tecnico: string;
  motor: Fuel;
  diagnostico: string;
  queSeHizo: string;
  pieza: string;
  dtcs: string[];
  mil: boolean;
};

const ORDERS_KEY = "galgot-orders-v1";

function readOrders(): WorkOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? (JSON.parse(raw) as WorkOrder[]) : [];
  } catch {
    return [];
  }
}

function writeOrders(orders: WorkOrder[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

function liveVehicle(scan: LiveScan, freeze: FreezeFrame | null): ScanProfile {
  return {
    id: "live",
    label: "Vehículo enlazado",
    marca: scan.marca,
    modelo: scan.modelo,
    anio: scan.anio,
    motor: "gasolina",
    vin: scan.vin,
    placas: "",
    km: 0,
    mil: scan.mil,
    codes: scan.codes,
    linkMs: scan.linkMs,
    protocol: scan.protocol,
    freeze: freeze ?? {
      rpm: 0,
      velocidad: 0,
      tempRefrigerante: 0,
      cargaMotor: 0,
      presionMap: 0,
      voltajeBateria: 0,
    },
    modules: scan.modules,
  };
}

type GalgotState = {
  status: SessionStatus;
  mode: LinkMode | null;
  simHost: string;
  simPort: string;
  profileId: string;
  mil: boolean;
  codes: string[];
  freeze: FreezeFrame | null;
  freezeCaptured: boolean;
  freezeLive: boolean;
  modules: VehicleModule[];
  linkMs: number;
  protocol: string;
  adapterId: string;
  linkStep: number;
  linkError: string | null;
  busy: boolean;
  busLog: string[];
  vehicle: ScanProfile | null;
  orders: WorkOrder[];
  advanced: AdvancedScan | null;
  hydrateOrders: () => void;
  startLink: (mode: LinkMode, profileId?: string) => void;
  setLinkStep: (step: number) => void;
  setLinkError: (msg: string | null) => void;
  pushBusLog: (line: string) => void;
  finishLink: () => void;
  finishLinkLive: (scan: LiveScan) => void;
  cancelLink: () => void;
  disconnect: () => void;
  captureFreeze: () => Promise<void>;
  clearCodes: () => Promise<void>;
  reread: () => Promise<void>;
  scanAdvanced: () => Promise<void>;
  addOrder: (order: Omit<WorkOrder, "id" | "fecha">) => WorkOrder;
};

function isLive(mode: LinkMode | null): boolean {
  return mode === "usb" || mode === "ble";
}

export const useGalgot = create<GalgotState>((set, get) => ({
  status: "idle",
  mode: null,
  simHost: "127.0.0.1",
  simPort: "35000",
  profileId: "np300-misfire",
  mil: false,
  codes: [],
  freeze: null,
  freezeCaptured: false,
  freezeLive: false,
  modules: [],
  linkMs: 0,
  protocol: "",
  adapterId: "",
  linkStep: -1,
  linkError: null,
  busy: false,
  busLog: [],
  vehicle: null,
  orders: [],
  advanced: null,
  hydrateOrders: () => set({ orders: readOrders() }),
  startLink: (mode, profileId) => {
    const id = profileId ?? get().profileId;
    set({
      status: "linking",
      mode,
      profileId: id,
      linkStep: 0,
      freezeCaptured: false,
      freezeLive: false,
      linkError: null,
      busLog: [],
    });
  },
  setLinkStep: (step) => set({ linkStep: step }),
  setLinkError: (msg) => set({ linkError: msg, busy: false }),
  pushBusLog: (line) =>
    set((s) => ({ busLog: [...s.busLog, line].slice(-28) })),
  finishLink: () => {
    const profile = profileById(get().profileId);
    set({
      status: "linked",
      linkStep: 3,
      mil: profile.mil,
      codes: profile.codes,
      freeze: profile.freeze,
      freezeCaptured: false,
      freezeLive: false,
      modules: profile.modules,
      linkMs: profile.linkMs,
      protocol: profile.protocol,
      adapterId: "Simulador TCP",
      vehicle: profile,
      linkError: null,
      advanced: sampleAdvanced({
        protocol: profile.protocol,
        vin: profile.vin,
        codes: profile.codes,
        motor: profile.motor,
      }),
    });
  },
  finishLinkLive: (scan) => {
    set({
      status: "linked",
      linkStep: 3,
      mil: scan.mil,
      codes: scan.codes,
      freeze: scan.freeze,
      freezeCaptured: Boolean(scan.freeze),
      freezeLive: scan.freezeLive,
      modules: scan.modules,
      linkMs: scan.linkMs,
      protocol: scan.protocol,
      adapterId: scan.adapter,
      vehicle: liveVehicle(scan, scan.freeze),
      linkError: null,
      advanced: null,
    });
  },
  cancelLink: () => {
    const elm = getElm();
    void elm?.close();
    setElm(null);
    set({
      status: "idle",
      mode: null,
      linkStep: -1,
      linkError: null,
      busy: false,
    });
  },
  disconnect: () => {
    const elm = getElm();
    void elm?.close();
    setElm(null);
    set({
      status: "idle",
      mode: null,
      mil: false,
      codes: [],
      freeze: null,
      freezeCaptured: false,
      freezeLive: false,
      modules: [],
      linkMs: 0,
      protocol: "",
      adapterId: "",
      linkStep: -1,
      linkError: null,
      busy: false,
      busLog: [],
      vehicle: null,
      advanced: null,
    });
  },
  captureFreeze: async () => {
    const elm = getElm();
    if (isLive(get().mode) && elm) {
      set({ busy: true, linkError: null });
      try {
        const { frame, live } = await elm.readFreeze();
        set({ freeze: frame, freezeCaptured: true, freezeLive: live, busy: false });
      } catch (err) {
        set({ busy: false, linkError: spanishSerialError(err) });
      }
      return;
    }
    set({ freezeCaptured: true, freezeLive: false });
  },
  clearCodes: async () => {
    const elm = getElm();
    if (isLive(get().mode) && elm) {
      set({ busy: true, linkError: null });
      try {
        await elm.clearCodes();
        const read = await elm.readDtcs();
        const vehicle = get().vehicle;
        set({
          mil: read.mil,
          codes: read.codes,
          freezeCaptured: false,
          busy: false,
          vehicle: vehicle ? { ...vehicle, mil: read.mil, codes: read.codes } : vehicle,
        });
      } catch (err) {
        set({ busy: false, linkError: spanishSerialError(err) });
      }
      return;
    }
    set({ mil: false, codes: [], freezeCaptured: false });
  },
  reread: async () => {
    const elm = getElm();
    if (isLive(get().mode) && elm) {
      set({ busy: true, linkError: null });
      try {
        const read = await elm.readDtcs();
        const vehicle = get().vehicle;
        set({
          mil: read.mil,
          codes: read.codes,
          busy: false,
          vehicle: vehicle ? { ...vehicle, mil: read.mil, codes: read.codes } : vehicle,
        });
      } catch (err) {
        set({ busy: false, linkError: spanishSerialError(err) });
      }
      return;
    }
    const profile = profileById(get().profileId);
    set({ mil: profile.mil, codes: profile.codes, freeze: profile.freeze });
  },
  scanAdvanced: async () => {
    const elm = getElm();
    if (isLive(get().mode) && elm) {
      set({ busy: true, linkError: null });
      try {
        const advanced = await elm.scanAdvanced();
        const codes = [...new Set([...advanced.stored, ...advanced.pending, ...advanced.permanent])];
        const vehicle = get().vehicle;
        set({
          advanced,
          codes: codes.length ? codes : get().codes,
          mil: get().mil || advanced.stored.length > 0,
          busy: false,
          vehicle: vehicle
            ? { ...vehicle, vin: advanced.info.vin || vehicle.vin, codes: codes.length ? codes : vehicle.codes }
            : vehicle,
        });
      } catch (err) {
        set({ busy: false, linkError: spanishSerialError(err) });
      }
      return;
    }
    const profile = get().vehicle ?? profileById(get().profileId);
    set({
      advanced: sampleAdvanced({
        protocol: profile.protocol,
        vin: profile.vin,
        codes: get().codes.length ? get().codes : profile.codes,
        motor: profile.motor,
      }),
    });
  },
  addOrder: (draft) => {
    const order: WorkOrder = {
      ...draft,
      id: `GH-${Date.now().toString(36).toUpperCase()}`,
      fecha: Date.now(),
    };
    const orders = [order, ...get().orders].slice(0, 40);
    writeOrders(orders);
    set({ orders });
    return order;
  },
}));
