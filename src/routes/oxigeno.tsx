import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { AppShell, StatusChip } from "@/components/shell";
import { O2Scope } from "@/components/o2-scope";
import { PrimaryButton, SecondaryButton } from "@/components/ui-buttons";
import { getElm } from "@/lib/obd/elm327";
import {
  analyzeOxygen,
  kindFromSession,
  O2_KINDS,
  simulateOxygen,
  type O2Kind,
  type OxygenSample,
} from "@/lib/obd/oxygen";
import { useGalgot } from "@/lib/store";
import { lookupDtc } from "@/lib/wiki";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/oxigeno")({ component: Oxigeno });

function mergeSample(prev: OxygenSample | undefined, next: OxygenSample): OxygenSample {
  if (!prev) return next;
  return {
    t: next.t,
    rpm: next.rpm ?? prev.rpm,
    temp: next.temp ?? prev.temp,
    pre: next.pre ?? prev.pre,
    post: next.post ?? prev.post,
    pre2: next.pre2 ?? prev.pre2,
    post2: next.post2 ?? prev.post2,
    stft: next.stft ?? prev.stft,
    ltft: next.ltft ?? prev.ltft,
    lambda: next.lambda ?? prev.lambda,
    wideband: next.wideband || prev.wideband,
  };
}

function Oxigeno() {
  const navigate = useNavigate();
  const session = useGalgot();
  const linked = session.status === "linked" && session.vehicle;
  const live = session.mode === "usb" || session.mode === "ble";
  const motor = session.vehicle?.motor ?? "gasolina";
  const sessionKind = kindFromSession(session.profileId, session.codes, motor);
  const [kind, setKind] = useState<O2Kind>(sessionKind);
  const [running, setRunning] = useState(true);
  const [samples, setSamples] = useState<OxygenSample[]>([]);
  const [error, setError] = useState<string | null>(null);
  const t0 = useRef(Date.now());
  const tickN = useRef(0);

  useEffect(() => {
    setKind(sessionKind);
  }, [sessionKind]);

  useEffect(() => {
    setSamples([]);
    t0.current = Date.now();
    tickN.current = 0;
  }, [kind]);

  useEffect(() => {
    if (!running) return;
    let stop = false;
    let timer = 0;
    const tick = async () => {
      if (stop) return;
      try {
        if (live) {
          const elm = getElm();
          if (!elm) {
            setError("Se perdió el adaptador. Vuelve a conectar.");
            setRunning(false);
            return;
          }
          const n = tickN.current++;
          const pass = n === 0 || n % 10 === 0 ? "full" : n % 4 === 0 ? "trims" : "wave";
          const s = await elm.readOxygen(pass);
          setSamples((prev) => [...prev, mergeSample(prev.at(-1), s)].slice(-120));
          setError(null);
        } else {
          const t = Date.now() - t0.current;
          setSamples((prev) => [...prev, simulateOxygen(kind, t)].slice(-120));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo leer O2");
      }
      if (!stop) timer = window.setTimeout(tick, live ? 280 : 100);
    };
    void tick();
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [running, live, kind]);

  const report = useMemo(
    () => analyzeOxygen(samples, kind === "diesel" ? "diesel" : motor, session.codes),
    [samples, motor, session.codes, kind],
  );
  const last = samples.at(-1);
  const progress = Math.min(1, report.windowSec / 3);

  return (
    <AppShell
      eyebrow="Sensores O2"
      status={live ? session.adapterId || "ELM327" : linked ? "Entrenamiento" : "Sin enlace"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip tone={report.closedLoop ? "ok" : "idle"}>
          {report.closedLoop ? "Lazo cerrado" : "Lazo abierto"}
        </StatusChip>
        <StatusChip tone={report.warm ? "ok" : "warn"}>
          {last?.temp != null ? `${last.temp} °C` : "Temp. —"}
        </StatusChip>
        {last?.rpm != null ? <StatusChip tone="info">{last.rpm} rpm</StatusChip> : null}
        <StatusChip tone={report.ready ? "ok" : "idle"}>
          {report.ready ? "Ventana lista" : `${report.windowSec.toFixed(1)} s`}
        </StatusChip>
      </div>

      <h1 className="stagger-in mt-3 font-display text-4xl leading-none font-bold tracking-[0.06em] text-fg uppercase">
        Sensores de oxígeno
      </h1>
      <p className="stagger-in mt-2 max-w-prose text-sm leading-relaxed text-muted">
        Delantero (B1S1) debe bailar ~1 Hz entre 0.1 y 0.9 V. Trasero (B1S2) se
        queda quieto si el gato sirve. Motor caliente, relantí.
      </p>

      {!live ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {O2_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              aria-pressed={kind === k.id}
              onClick={() => setKind(k.id)}
              className={cn(
                "min-h-11 rounded-full px-3.5 py-2 font-display text-[11px] tracking-[0.14em] uppercase transition-colors",
                kind === k.id
                  ? "bg-crimson text-fg"
                  : "bg-bg-deep text-muted shadow-[var(--shadow-border)]",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
      ) : null}

      {!linked ? (
        <p className="mt-3 text-sm text-muted">
          Entrenamiento de bahía. Para leer el coche,{" "}
          <button
            type="button"
            className="text-chrome underline decoration-border underline-offset-2"
            onClick={() => navigate({ to: "/conectar" })}
          >
            conecta el ELM327
          </button>
          .
        </p>
      ) : null}

      <div className="mt-4">
        <O2Scope samples={samples} preHz={report.preHz} postHz={report.postHz} />
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface">
        <div
          className={cn("h-full rounded-full", report.ready ? "bg-ok" : "bg-warn")}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <PidCell label="B1S1 delantero" value={last?.pre != null ? `${last.pre.toFixed(2)} V` : "—"} />
        <PidCell label="B1S2 trasero" value={last?.post != null ? `${last.post.toFixed(2)} V` : "—"} />
        <PidCell
          label="STFT banco 1"
          value={last?.stft != null ? `${last.stft > 0 ? "+" : ""}${last.stft.toFixed(1)} %` : "—"}
        />
        <PidCell
          label="LTFT banco 1"
          value={last?.ltft != null ? `${last.ltft > 0 ? "+" : ""}${last.ltft.toFixed(1)} %` : "—"}
        />
      </div>

      {last?.lambda != null ? (
        <p className="mt-2 font-mono text-sm text-chrome">
          Lambda {last.lambda.toFixed(3)} {last.wideband ? "· wideband" : ""}
        </p>
      ) : null}

      {last?.pre2 != null ? (
        <p className="mt-1 font-mono text-xs text-muted">
          Banco 2 · B2S1 {last.pre2.toFixed(2)} V
          {last.post2 != null ? ` · B2S2 ${last.post2.toFixed(2)} V` : ""}
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-warn">{error}</p> : null}

      <div className="mt-3 flex gap-2">
        <PrimaryButton
          className="flex-1"
          onClick={() => {
            if (!running) {
              t0.current = Date.now();
              tickN.current = 0;
            }
            setRunning((v) => !v);
          }}
        >
          {running ? <Pause className="size-4" /> : <Play className="size-4" />}
          {running ? "Pausar" : "Capturar"}
        </PrimaryButton>
        <SecondaryButton
          className="flex-1"
          onClick={() => {
            setSamples([]);
            tickN.current = 0;
            t0.current = Date.now();
          }}
        >
          Limpiar
        </SecondaryButton>
      </div>
      <p className="mt-2 text-xs text-muted">
        {live
          ? "Lee PID 0114 / 0115 / 0106 / 0107 del ECM. Ignición ON, motor caliente, relantí. Pestaña completa de Chrome, no el recuadro."
          : "Onda de entrenamiento. En USB sale del coche, no se inventa."}
      </p>

      <section className="mt-6 space-y-2">
        {[report.overall, ...report.sensors, report.trims]
          .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
          .map((call) => (
            <article key={call.id} className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-[11px] tracking-[0.16em] text-muted uppercase">
                    {call.name}
                  </p>
                  <h2 className="mt-1 font-sans text-sm font-semibold text-fg">{call.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{call.detail}</p>
                </div>
                <StatusChip tone={call.tone === "idle" ? "idle" : call.tone}>
                  {call.tone === "ok" ? "OK" : call.tone === "bad" ? "Falla" : call.tone === "warn" ? "Ojo" : "—"}
                </StatusChip>
              </div>
            </article>
          ))}
      </section>

      {report.codesHint.length > 0 ? (
        <section className="mt-6">
          <p className="font-display text-[11px] tracking-[0.2em] text-muted uppercase">
            Códigos relacionados
          </p>
          <ul className="mt-2 space-y-2">
            {report.codesHint.map((c) => {
              const e = lookupDtc(c);
              return (
                <li key={c}>
                  <Link
                    to="/wiki/$codigo"
                    params={{ codigo: c }}
                    className="block rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]"
                  >
                    <p className="font-mono text-sm text-crimson">{e.codigo}</p>
                    <p className="mt-1 text-sm text-fg">{e.descripcion}</p>
                    <p className="mt-1 text-xs text-muted">{e.accion}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <SecondaryButton className="mt-4" onClick={() => navigate({ to: linked ? "/diagnostico" : "/" })}>
        Volver
      </SecondaryButton>
    </AppShell>
  );
}

function PidCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface px-3 py-3 shadow-[var(--shadow-border)]">
      <p className="font-display text-[10px] tracking-[0.16em] text-muted uppercase">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-fg">{value}</p>
    </div>
  );
}
