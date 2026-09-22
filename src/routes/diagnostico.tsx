import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, Camera, Eraser, FileOutput, RefreshCw } from "lucide-react";
import { AppShell, StatusChip } from "@/components/shell";
import { DtcCard } from "@/components/dtc-card";
import { FreezeFrameGrid } from "@/components/freeze-frame";
import { DangerButton, PrimaryButton, SecondaryButton } from "@/components/ui-buttons";
import { useGalgot } from "@/lib/store";
import { lookupDtc, WIKI_COUNT } from "@/lib/wiki";

export const Route = createFileRoute("/diagnostico")({ component: Diagnostico });

function Diagnostico() {
  const navigate = useNavigate();
  const session = useGalgot();
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  if (session.status !== "linked" || !session.vehicle) {
    return (
      <AppShell eyebrow="Diagnóstico" status="Sin enlace">
        <h1 className="font-display text-3xl font-bold tracking-[0.08em] uppercase">
          No hay enlace
        </h1>
        <p className="mt-2 text-sm text-muted">Primero conecta el adaptador USB o Bluetooth.</p>
        <PrimaryButton className="mt-6" onClick={() => navigate({ to: "/conectar" })}>
          Conectar al vehículo
        </PrimaryButton>
      </AppShell>
    );
  }

  const v = session.vehicle;
  const findings = session.codes.map(lookupDtc);
  const primary = session.codes[0];
  const live = session.mode === "usb" || session.mode === "ble";

  function exportReport() {
    const lines = [
      `GREYHOUND SERVICIO AUTOMOTRIZ · EST. 1978`,
      `Reporte GALGOT ${new Date().toLocaleString("es-MX")}`,
      `${v.marca} ${v.modelo} ${v.anio || ""}  ${v.placas}  VIN ${v.vin}`,
      `Protocolo ${session.protocol} · enlace ${session.linkMs} ms`,
      `Adaptador ${session.adapterId}`,
      `MIL ${session.mil ? "ENCENDIDO" : "apagado"}`,
      ``,
      ...session.codes.map((c) => {
        const e = lookupDtc(c);
        return `${c}  ${e.descripcion}\n${e.sencillo}\nAcción: ${e.accion}`;
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `galgot-${v.vin || v.placas || "scan"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell
      eyebrow="Diagnóstico"
      status={live ? session.adapterId || "ELM327" : "Simulador activo · entrenamiento"}
      footerRight={`${WIKI_COUNT} códigos en E_WIKI`}
    >
      <div className="stagger-in flex flex-wrap items-center gap-2">
        {session.mil ? (
          <StatusChip tone="bad">MIL encendido</StatusChip>
        ) : (
          <StatusChip tone="ok">MIL apagado</StatusChip>
        )}
        <Link to="/enlace">
          <StatusChip tone="info">Enlace {session.linkMs} ms</StatusChip>
        </Link>
      </div>

      <h1 className="stagger-in mt-3 font-display text-3xl leading-none font-bold tracking-[0.08em] text-fg uppercase">
        {session.mil ? "Check Engine — falla activa" : "Sin fallas activas"}
      </h1>
      <p className="stagger-in mt-2 text-sm text-chrome">
        {v.marca} {v.modelo}
        {v.anio ? ` ${v.anio}` : ""}
        {v.km ? ` · ${v.km.toLocaleString("es-MX")} km` : ""}
        {v.placas ? ` · ${v.placas}` : ""}
        {v.vin ? ` · ${v.vin}` : ""}
      </p>

      {session.freezeCaptured && session.freeze ? (
        <div className="mt-5">
          <FreezeFrameGrid
            frame={session.freeze}
            code={primary}
            live={session.freezeLive}
            real={live}
          />
        </div>
      ) : null}

      <p className="stagger-in mt-6 font-display text-[11px] tracking-[0.2em] text-muted uppercase">
        Códigos detectados {session.codes.length}
      </p>

      {findings.length === 0 ? (
        <section className="mt-3 rounded-2xl bg-ok/10 p-4">
          <p className="font-sans text-sm font-semibold text-ok">Sin códigos de falla</p>
          <p className="mt-1 text-sm text-muted">
            El ECM respondió limpio. Puedes capturar freeze frame en ralentí o
            guardar la orden en blanco.
          </p>
        </section>
      ) : (
        <div className="mt-3 space-y-3">
          {findings.map((entry, i) => (
            <DtcCard key={entry.codigo} entry={entry} index={i} total={findings.length} />
          ))}
        </div>
      )}

      {session.linkError ? (
        <p className="mt-3 text-sm text-warn">{session.linkError}</p>
      ) : null}

      <div className="mt-4 grid gap-2">
        <SecondaryButton disabled={session.busy} onClick={() => void session.reread()}>
          <RefreshCw className="size-4" />
          {session.busy ? "Leyendo…" : "Leer DTCs en vivo"}
        </SecondaryButton>
        <p className="-mt-1 px-1 text-xs text-muted">Modo 03 · vuelve a escanear el ECM</p>

        <SecondaryButton disabled={session.busy} onClick={() => void session.captureFreeze()}>
          <Camera className="size-4" />
          {session.busy ? "Leyendo…" : "Capturar freeze frame"}
        </SecondaryButton>
        <p className="-mt-1 px-1 text-xs text-muted">
          Modo 02; si no hay freeze, lee PIDs en vivo
        </p>

        <SecondaryButton onClick={() => navigate({ to: "/oxigeno" })}>
          <Activity className="size-4" />
          Analizar sensores O2
        </SecondaryButton>
        <p className="-mt-1 px-1 text-xs text-muted">
          PID 0114 / 0115 · delantero vs trasero y trims
        </p>

        <DangerButton disabled={session.busy} onClick={() => setConfirmClear(true)}>
          <Eraser className="size-4" />
          Borrar códigos // apagar MIL
        </DangerButton>
        <p className="-mt-1 px-1 text-xs text-muted">Pide confirmación. Manda modo 04 al coche.</p>
      </div>

      {confirmClear ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-bg-deep/70 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)]">
            <h2 className="font-display text-xl tracking-[0.08em] uppercase">¿Borrar códigos?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Se manda modo 04 al ECM y se apaga el MIL. Si la falla sigue ahí,
              vuelven a aparecer al rodar. No sustituye la reparación.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <DangerButton
                disabled={session.busy}
                onClick={() => {
                  void session.clearCodes().then(() => {
                    setConfirmClear(false);
                    setCleared(true);
                  });
                }}
              >
                Sí, borrar
              </DangerButton>
              <SecondaryButton onClick={() => setConfirmClear(false)}>Cancelar</SecondaryButton>
            </div>
          </div>
        </div>
      ) : null}

      {cleared && !session.mil ? (
        <p className="mt-3 text-sm text-ok">El ECM confirmó el borrado.</p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <PrimaryButton className="sm:flex-1" onClick={() => navigate({ to: "/orden" })}>
          Guardar en orden de trabajo
        </PrimaryButton>
        <SecondaryButton className="sm:flex-1" onClick={exportReport}>
          <FileOutput className="size-4" />
          Exportar reporte
        </SecondaryButton>
      </div>

      <p className="mt-4 text-xs text-muted">
        {live
          ? `${session.adapterId || "ELM327"} · ${session.protocol}`
          : "Modo entrenamiento — no hay coche en el bus"}
      </p>
    </AppShell>
  );
}
