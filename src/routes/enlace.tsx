import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, StatusChip } from "@/components/shell";
import { ModuleTree } from "@/components/module-tree";
import { SecondaryButton } from "@/components/ui-buttons";
import { getElm, spanishSerialError } from "@/lib/obd/elm327";
import { LINK_STEPS, profileById } from "@/lib/simulator";
import { useGalgot } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/enlace")({ component: Enlace });

function Enlace() {
  const navigate = useNavigate();
  const session = useGalgot();
  const {
    status,
    mode,
    profileId,
    linkStep,
    modules,
    vehicle,
    protocol,
    adapterId,
    linkMs,
    linkError,
    busLog,
    setLinkStep,
    finishLink,
    finishLinkLive,
    cancelLink,
    setLinkError,
    pushBusLog,
  } = session;
  const profile = profileById(profileId);
  const [revealed, setRevealed] = useState(0);
  const linked = status === "linked";
  const live = mode === "usb" || mode === "ble";

  useEffect(() => {
    if (status === "idle") {
      navigate({ to: "/conectar" });
    }
  }, [status, navigate]);

  useEffect(() => {
    if (status !== "linking" || mode !== "sim") return;
    const timers = [
      window.setTimeout(() => setLinkStep(1), 900),
      window.setTimeout(() => setLinkStep(2), 1900),
      window.setTimeout(() => {
        finishLink();
      }, 2800),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [status, mode, setLinkStep, finishLink]);

  useEffect(() => {
    if (status !== "linking" || !live) return;
    const elm = getElm();
    if (!elm) {
      setLinkError("Se perdió el puerto. Vuelve a conectar el adaptador.");
      return;
    }
    elm.onLog = (line) => pushBusLog(line);
    let cancelled = false;
    (async () => {
      try {
        setLinkStep(0);
        await elm.wake();
        if (cancelled) return;
        setLinkStep(1);
        await elm.configureProtocol();
        if (cancelled) return;
        setLinkStep(2);
        const scan = await elm.scanLink();
        if (cancelled) return;
        finishLinkLive(scan);
      } catch (err) {
        if (!cancelled) setLinkError(spanishSerialError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, live, setLinkStep, finishLinkLive, setLinkError, pushBusLog]);

  useEffect(() => {
    if (!linked) {
      setRevealed(0);
      return;
    }
    const list = vehicle?.modules ?? modules;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setRevealed(i);
      if (i >= list.length) window.clearInterval(id);
    }, 180);
    return () => window.clearInterval(id);
  }, [linked, vehicle?.modules, modules]);

  function cancel() {
    cancelLink();
    navigate({ to: "/conectar" });
  }

  const current = Math.min(Math.max(linkStep, 0), 2);
  const shownModules = linked ? (vehicle?.modules ?? modules) : live ? modules : profile.modules;
  const title = vehicle
    ? `${vehicle.marca} ${vehicle.modelo}${vehicle.anio ? ` ${vehicle.anio}` : ""}`
    : live
      ? adapterId || "ELM327"
      : `${profile.marca} ${profile.modelo} ${profile.anio}`;
  const wireLabel = mode === "ble" ? "Bluetooth" : mode === "usb" ? "USB · ELM327" : "Entrenamiento";

  return (
    <AppShell
      eyebrow="Diagnóstico"
      status={linked ? (live ? adapterId || "ELM327" : "Simulador · entrenamiento") : "Conectando"}
    >
      <p className="stagger-in font-display text-[11px] tracking-[0.2em] text-muted uppercase">
        {wireLabel} — no desconectes el adaptador
      </p>
      <h1 className="stagger-in mt-1 font-display text-4xl leading-none font-bold tracking-[0.06em] text-fg uppercase">
        {linked ? "Enlace verificado" : linkError ? "Enlace falló" : "Enlazando con el vehículo"}
      </h1>
      <p className="stagger-in mt-2 text-sm text-chrome">
        {title} · {protocol || profile.protocol}
      </p>
      {vehicle?.vin ? (
        <p className="mt-1 font-mono text-xs text-muted">VIN {vehicle.vin}</p>
      ) : null}

      <ol className="mt-6 space-y-2">
        {LINK_STEPS.map((step, i) => {
          const done = linked || i < current;
          const active = !linked && !linkError && i === current;
          return (
            <li
              key={step.id}
              className="flex items-start justify-between gap-3 rounded-2xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]"
            >
              <div>
                <p className="font-sans text-sm font-semibold text-fg">{step.title}</p>
                <p className="text-xs text-muted">{step.detail}</p>
              </div>
              <StatusChip tone={done ? "ok" : active ? "warn" : "idle"}>
                {done ? "Listo" : active ? "En curso" : "Pendiente"}
              </StatusChip>
            </li>
          );
        })}
      </ol>

      {linkError ? (
        <p className="mt-4 rounded-2xl bg-bad/10 p-4 text-sm text-bad">{linkError}</p>
      ) : null}

      {live && busLog.length > 0 ? (
        <pre className="mt-4 max-h-40 overflow-auto rounded-2xl bg-bg-deep p-3 font-mono text-[11px] leading-relaxed text-chrome">
          {busLog.slice(-14).join("\n")}
        </pre>
      ) : null}

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm tracking-[0.16em] text-muted uppercase">
            Módulos
          </h2>
          {linked ? (
            <StatusChip tone="ok">{linkMs || vehicle?.linkMs || profile.linkMs} ms ECM</StatusChip>
          ) : null}
        </div>
        <ModuleTree modules={shownModules} revealed={linked ? revealed : live ? revealed : 0} />
      </section>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        {linked ? (
          <button
            type="button"
            onClick={() => navigate({ to: "/diagnostico" })}
            className={cn(
              "inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-crimson px-4 font-display text-[15px] font-semibold tracking-[0.12em] text-fg uppercase",
              "transition-transform duration-150 active:scale-[0.96]",
            )}
          >
            Ver códigos
          </button>
        ) : (
          <SecondaryButton onClick={cancel}>Cancelar</SecondaryButton>
        )}
        {linked ? (
          <SecondaryButton
            className="sm:flex-1"
            onClick={() => {
              cancelLink();
              navigate({ to: "/conectar" });
            }}
          >
            Cambiar adaptador
          </SecondaryButton>
        ) : null}
      </div>
    </AppShell>
  );
}
