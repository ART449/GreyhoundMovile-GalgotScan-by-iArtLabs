import type { Fuel } from "@/lib/simulator";

export type OxygenSample = {
  t: number;
  rpm: number | null;
  temp: number | null;
  pre: number | null;
  post: number | null;
  pre2: number | null;
  post2: number | null;
  stft: number | null;
  ltft: number | null;
  lambda: number | null;
  wideband: boolean;
};

export type CallTone = "ok" | "warn" | "bad" | "idle";

export type SensorCall = {
  id: string;
  name: string;
  tone: CallTone;
  title: string;
  detail: string;
};

export type OxygenReport = {
  warm: boolean;
  closedLoop: boolean;
  ready: boolean;
  windowSec: number;
  preHz: number | null;
  postHz: number | null;
  overall: SensorCall;
  sensors: SensorCall[];
  trims: SensorCall;
  cat: SensorCall;
  codesHint: string[];
};

const WINDOW_MS = 8000;
const MIN_SEC = 3;

export function decodeO2Voltage(p: number[]): { v: number; stft: number | null } {
  const v = Math.round((p[0] ?? 0) * 5) / 1000;
  if (p[1] === undefined || p[1] === 0xff) return { v, stft: null };
  return { v, stft: decodeTrimByte(p[1]) };
}

export function decodeTrimByte(a: number): number {
  return Math.round(((a - 128) * 1000) / 128) / 10;
}

export function decodeLambda(p: number[]): number {
  const raw = ((p[0] ?? 0) << 8) + (p[1] ?? 0);
  return Math.round((raw / 32768) * 1000) / 1000;
}

export function crossCount(values: number[], threshold = 0.45): number {
  let n = 0;
  for (let i = 1; i < values.length; i++) {
    const a = values[i - 1] ?? 0;
    const b = values[i] ?? 0;
    if ((a - threshold) * (b - threshold) < 0) n += 1;
  }
  return n;
}

type Series = {
  min: number;
  max: number;
  mean: number;
  range: number;
  crosses: number;
  hz: number;
  duration: number;
};

function pick(samples: OxygenSample[], key: keyof OxygenSample): { v: number; t: number }[] {
  const out: { v: number; t: number }[] = [];
  for (const s of samples) {
    const v = s[key];
    if (typeof v === "number" && Number.isFinite(v)) out.push({ v, t: s.t });
  }
  return out;
}

function seriesOf(points: { v: number; t: number }[]): Series | null {
  if (points.length < 6) return null;
  const values = points.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const duration = Math.max(0.001, (points[points.length - 1]!.t - points[0]!.t) / 1000);
  const crosses = crossCount(values);
  return {
    min,
    max,
    mean,
    range: max - min,
    crosses,
    hz: (crosses / 2) / duration,
    duration,
  };
}

function lastFinite(samples: OxygenSample[], key: keyof OxygenSample): number | undefined {
  for (let i = samples.length - 1; i >= 0; i--) {
    const v = samples[i]?.[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return undefined;
}

export function analyzeOxygen(
  samples: OxygenSample[],
  motor: Fuel,
  codes: string[],
): OxygenReport {
  const tEnd = samples.at(-1)?.t ?? 0;
  const window = samples.filter((s) => tEnd - s.t <= WINDOW_MS);
  const last = window.at(-1);
  const warm = last?.temp == null ? window.length >= 8 : last.temp >= 70;
  const diesel = motor === "diesel";
  const lambdaPts = pick(window, "lambda");
  const preS = seriesOf(pick(window, "pre"));
  const postS = seriesOf(pick(window, "post"));
  const stftNow = lastFinite(window, "stft");
  const ltftNow = lastFinite(window, "ltft");
  const wideband = window.some((s) => s.wideband) || (!preS && lambdaPts.length > 0);
  const windowSec =
    window.length >= 2 ? Math.max(0, (tEnd - (window[0]?.t ?? tEnd)) / 1000) : 0;
  const ready = windowSec >= MIN_SEC && (Boolean(preS) || lambdaPts.length >= 4);
  const hints = codes.filter((c) => /^P01[3-6]|^P017|^P042|^P043|^P227/.test(c));

  if (diesel && !preS) {
    const lam = lastFinite(window, "lambda");
    const lambdaCall: SensorCall =
      lam == null
        ? {
            id: "lambda",
            name: "Lambda / NOx",
            tone: "idle",
            title: "Sin PID de O2 zirconio",
            detail:
              "En diésel el banco no oscila 0.1–0.9 V. Si hay lambda, debería vivir cerca de 1.00 en relantí caliente.",
          }
        : lam > 1.08
          ? {
              id: "lambda",
              name: "Lambda",
              tone: "warn",
              title: `Lambda ${lam.toFixed(3)} — mezcla pobre`,
              detail: "Aire de más o sensor NOx/lambda sucio. No lo trates como un O2 de gasolina.",
            }
          : lam < 0.92
            ? {
                id: "lambda",
                name: "Lambda",
                tone: "warn",
                title: `Lambda ${lam.toFixed(3)} — mezcla rica`,
                detail: "Combustible de más o sensor sesgado. Revisa riel y EGR antes de cambiar el sensor.",
              }
            : {
                id: "lambda",
                name: "Lambda",
                tone: "ok",
                title: `Lambda ${lam.toFixed(3)} — en rango`,
                detail: "Cerca de estequiométrico. El DPF/NOx se diagnostica por modo 06, no por este voltaje.",
              };
    return {
      warm,
      closedLoop: lam != null,
      ready,
      windowSec,
      preHz: null,
      postHz: null,
      overall: lambdaCall,
      sensors: [lambdaCall],
      trims: {
        id: "trims",
        name: "Trims",
        tone: "idle",
        title: "STFT/LTFT de gasolina no aplican igual",
        detail: "En diésel mira MAP, rail y NOx. No copies el método del NP300.",
      },
      cat: {
        id: "cat",
        name: "Post / DPF",
        tone: "idle",
        title: "No uses el truco del O2 trasero",
        detail: "El catalizador/DPF diésel no se lee comparando pre y post de 1 V.",
      },
      codesHint: hints,
    };
  }

  const capturing: SensorCall = {
    id: "pre",
    name: "B1S1 · delantero",
    tone: "idle",
    title: `Capturando ${Math.min(windowSec, MIN_SEC).toFixed(1)} / ${MIN_SEC} s`,
    detail: "Necesito unos segundos en relantí caliente antes de sentenciar el sensor.",
  };

  let preCall: SensorCall;
  if (!warm) {
    preCall = {
      id: "pre",
      name: "B1S1 · delantero",
      tone: "idle",
      title: "Motor frío — no sentencies el O2",
      detail: "Hasta ~70 °C el sensor miente y el ECM aún no cierra el lazo. Espera a temperatura de trabajo.",
    };
  } else if (!ready || !preS) {
    preCall = capturing;
  } else if (preS.max < 0.42 || (preS.range < 0.15 && preS.mean < 0.35)) {
    preCall = {
      id: "pre",
      name: "B1S1 · delantero",
      tone: "bad",
      title: `Pegado pobre ${preS.mean.toFixed(2)} V`,
      detail:
        "No llega a rico. Fuga de escape/vacío, calentador muerto o sensor abierto. Cruza con STFT positivo — no cambies el O2 primero.",
    };
  } else if (preS.min > 0.55 || (preS.range < 0.15 && preS.mean > 0.65)) {
    preCall = {
      id: "pre",
      name: "B1S1 · delantero",
      tone: "bad",
      title: `Pegado rico ${preS.mean.toFixed(2)} V`,
      detail: "Se quedó alto. Inyector goteando, presión alta o sensor en corto a voltaje.",
    };
  } else if (preS.range < 0.1) {
    preCall = {
      id: "pre",
      name: "B1S1 · delantero",
      tone: "bad",
      title: "Sin actividad (tipo P0134)",
      detail: "Plano. Calentador, cable o sensor abierto. El ECM corre en lazo abierto.",
    };
  } else if (preS.hz < 0.45 || preS.range < 0.28) {
    preCall = {
      id: "pre",
      name: "B1S1 · delantero",
      tone: "warn",
      title: `O2 lento ${preS.hz.toFixed(2)} Hz (P0133)`,
      detail: `Rango ${preS.range.toFixed(2)} V. Viejo o envenenado. Cambia el delantero, no el trasero.`,
    };
  } else {
    preCall = {
      id: "pre",
      name: "B1S1 · delantero",
      tone: "ok",
      title: `Oscila ${preS.min.toFixed(2)}–${preS.max.toFixed(2)} V · ${preS.hz.toFixed(1)} Hz`,
      detail: "Lazo cerrado. El delantero está vivo. Si hay consumo, busca fugas y MAF, no este sensor.",
    };
  }

  let catCall: SensorCall;
  if (!postS) {
    catCall = {
      id: "cat",
      name: "B1S2 · trasero",
      tone: "idle",
      title: "Sin señal post-cat",
      detail: "PID 0115 no contestó. En 4 cilindros Nissan casi siempre hay uno trasero.",
    };
  } else if (!ready) {
    catCall = {
      id: "cat",
      name: "B1S2 · trasero",
      tone: "idle",
      title: "Esperando ventana",
      detail: "El gato se juzga cuando el delantero ya oscila.",
    };
  } else if (preS && preS.hz >= 0.5 && postS.hz >= 0.4 && postS.range > 0.35) {
    catCall = {
      id: "cat",
      name: "B1S2 · trasero",
      tone: "warn",
      title: `El trasero copia al delantero · ${postS.hz.toFixed(1)} Hz`,
      detail:
        "El catalizador ya no aplana la onda. Típico P0420. Confirma que el delantero oscile bien antes de vender el gato.",
    };
  } else if (postS.range < 0.25) {
    catCall = {
      id: "cat",
      name: "B1S2 · trasero",
      tone: "ok",
      title: `Estable ${postS.mean.toFixed(2)} V`,
      detail: "El post no baila. El gato está haciendo su trabajo — o el sensor trasero está muerto: cruza con P0136/P2270.",
    };
  } else {
    catCall = {
      id: "cat",
      name: "B1S2 · trasero",
      tone: "warn",
      title: `Se mueve ${postS.range.toFixed(2)} V`,
      detail: "Más actividad de la cuenta en el trasero. Mira gato, fugas de escape y el propio sensor.",
    };
  }

  const trimAbs = Math.max(Math.abs(stftNow ?? 0), Math.abs(ltftNow ?? 0));
  let trimCall: SensorCall;
  if (stftNow == null && ltftNow == null) {
    trimCall = {
      id: "trims",
      name: "Trims B1",
      tone: "idle",
      title: "Sin STFT/LTFT",
      detail: "PID 0106/0107 no contestaron. Sigue con la gráfica de voltaje.",
    };
  } else if ((ltftNow ?? 0) > 15 || (stftNow ?? 0) > 20) {
    trimCall = {
      id: "trims",
      name: "Trims B1",
      tone: "warn",
      title: `Pobre  STFT ${fmtTrim(stftNow)} · LTFT ${fmtTrim(ltftNow)}`,
      detail:
        "El ECM mete gasolina. Fuga de vacío, MAF sucio o presión baja. Si el O2 delantero está pegado bajo, no lo cambies primero.",
    };
  } else if ((ltftNow ?? 0) < -15 || (stftNow ?? 0) < -20) {
    trimCall = {
      id: "trims",
      name: "Trims B1",
      tone: "warn",
      title: `Rico  STFT ${fmtTrim(stftNow)} · LTFT ${fmtTrim(ltftNow)}`,
      detail: "El ECM quita gasolina. Inyector, presión alta o O2 mentiroso rico.",
    };
  } else if (trimAbs > 10) {
    trimCall = {
      id: "trims",
      name: "Trims B1",
      tone: "warn",
      title: `Al límite  STFT ${fmtTrim(stftNow)} · LTFT ${fmtTrim(ltftNow)}`,
      detail: "Todavía no es código, pero ya está compensando. Anótalo en la orden.",
    };
  } else {
    trimCall = {
      id: "trims",
      name: "Trims B1",
      tone: "ok",
      title: `STFT ${fmtTrim(stftNow)} · LTFT ${fmtTrim(ltftNow)}`,
      detail: "Compensación chica. Mezcla en rango de taller (±10 %).",
    };
  }

  const inferred: string[] = [];
  if (preCall.title.includes("lento") || preCall.title.includes("P0133")) inferred.push("P0133");
  if (preCall.title.includes("pobre")) inferred.push("P0131");
  if (preCall.title.includes("rico") && preCall.id === "pre") inferred.push("P0132");
  if (preCall.title.includes("P0134")) inferred.push("P0134");
  if (catCall.title.includes("copia") || catCall.title.includes("P0420")) inferred.push("P0420");
  if (trimCall.title.includes("Pobre")) inferred.push("P0171");
  if (trimCall.title.startsWith("Rico")) inferred.push("P0172");

  const closedLoop = Boolean(preS && preS.hz >= 0.4) || (wideband && lambdaPts.length > 0);
  const worst = [preCall, catCall, trimCall].sort((a, b) => rank(b.tone) - rank(a.tone))[0] ?? preCall;

  return {
    warm,
    closedLoop,
    ready,
    windowSec,
    preHz: preS?.hz ?? null,
    postHz: postS?.hz ?? null,
    overall: {
      id: "all",
      name: "Veredicto",
      tone: !warm || !ready ? "idle" : worst.tone,
      title: !warm ? "Espera a temperatura de trabajo" : !ready ? capturing.title : worst.title,
      detail: !warm ? preCall.detail : !ready ? capturing.detail : worst.detail,
    },
    sensors: [preCall, catCall],
    trims: trimCall,
    cat: catCall,
    codesHint: [...new Set([...hints, ...inferred])],
  };
}

function rank(t: CallTone): number {
  return t === "bad" ? 3 : t === "warn" ? 2 : t === "ok" ? 1 : 0;
}

function fmtTrim(n: number | null | undefined): string {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)} %`;
}

export type O2Kind = "healthy" | "lean" | "lazy" | "cat" | "rich" | "diesel";

export const O2_KINDS: { id: O2Kind; label: string }[] = [
  { id: "healthy", label: "Sano" },
  { id: "lean", label: "Pobre" },
  { id: "lazy", label: "Lento" },
  { id: "cat", label: "Gato" },
  { id: "rich", label: "Rico" },
  { id: "diesel", label: "Diésel" },
];

export function kindFromSession(profileId: string, codes: string[], motor: Fuel): O2Kind {
  if (motor === "diesel") return "diesel";
  if (codes.some((c) => c.startsWith("P042") || c.startsWith("P043"))) return "cat";
  if (codes.some((c) => c === "P0133" || c === "P0153")) return "lazy";
  if (codes.some((c) => c === "P0172" || c === "P0175")) return "rich";
  if (codes.some((c) => c === "P0171" || c === "P0174" || c === "P0131")) return "lean";
  if (profileId.includes("lean")) return "lean";
  if (profileId.includes("misfire")) return "lazy";
  if (profileId.includes("dpf") || profileId.includes("diesel")) return "diesel";
  if (profileId.includes("clean")) return "healthy";
  return "healthy";
}

export function simulateOxygen(kind: O2Kind, t: number): OxygenSample {
  const w = t / 1000;
  if (kind === "diesel") {
    return {
      t,
      rpm: 780,
      temp: 88,
      pre: null,
      post: null,
      pre2: null,
      post2: null,
      stft: null,
      ltft: null,
      lambda: 1.01 + 0.015 * Math.sin(w * 0.7),
      wideband: true,
    };
  }
  const wave = (hz: number, amp: number, mid: number) =>
    mid + amp * Math.sin(w * hz * Math.PI * 2);
  let pre = wave(1.35, 0.38, 0.5);
  let post = wave(0.12, 0.04, 0.68);
  let stft = wave(0.3, 3, 2);
  let ltft = 3;
  if (kind === "lean") {
    pre = wave(0.7, 0.1, 0.2);
    post = wave(0.15, 0.06, 0.32);
    stft = 18 + wave(0.2, 3, 0);
    ltft = 22;
  } else if (kind === "lazy") {
    pre = wave(0.18, 0.22, 0.5);
    post = wave(0.08, 0.05, 0.62);
    stft = wave(0.15, 5, 8);
    ltft = 9;
  } else if (kind === "cat") {
    pre = wave(1.4, 0.36, 0.5);
    post = wave(1.25, 0.32, 0.5);
    stft = wave(0.25, 4, 1);
    ltft = 4;
  } else if (kind === "rich") {
    pre = wave(0.8, 0.1, 0.82);
    post = wave(0.12, 0.05, 0.8);
    stft = -16 + wave(0.2, 2, 0);
    ltft = -19;
  }
  return {
    t,
    rpm: kind === "lean" ? 1880 : 820,
    temp: 91,
    pre: clampV(pre),
    post: clampV(post),
    pre2: null,
    post2: null,
    stft: Math.round(stft * 10) / 10,
    ltft,
    lambda: null,
    wideband: false,
  };
}

function clampV(n: number): number {
  return Math.round(Math.min(1.1, Math.max(0, n)) * 1000) / 1000;
}
