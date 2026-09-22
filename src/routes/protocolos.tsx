import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Radio, RefreshCw } from "lucide-react";
import { AppShell, StatusChip } from "@/components/shell";
import { PrimaryButton, SecondaryButton } from "@/components/ui-buttons";
import { PROTOCOL_ATLAS, familyFromName } from "@/lib/obd/protocols";
import { useGalgot } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/protocolos")({ component: Protocolos });

function Protocolos() {
  const navigate = useNavigate();
  const session = useGalgot();
  const linked = session.status === "linked";
  const live = session.mode === "usb" || session.mode === "ble";
  const advanced = session.advanced;
  const detectedFamily = familyFromName(session.protocol || advanced?.protocolName || "");
  const [openId, setOpenId] = useState<string | null>(detectedFamily === "unknown" ? "can11-500" : null);

  const highlighted = useMemo(() => {
    if (!session.protocol && !advanced?.family) return "";
    const fam = advanced?.family || detectedFamily;
    const hit = PROTOCOL_ATLAS.find((p) => p.family === fam && p.id !== "auto");
    return hit?.id ?? "";
  }, [session.protocol, advanced?.family, detectedFamily]);

  return (
    <AppShell
      eyebrow="Protocolos"
      status={linked ? session.protocol || "Enlazado" : "Atlas de bus"}
    >
      <h1 className="stagger-in font-display text-4xl leading-none font-bold tracking-[0.06em] text-fg uppercase">
        Capas OBD-II
      </h1>
      <p className="stagger-in mt-2 max-w-prose text-sm leading-relaxed text-muted">
        Del K-line de los 90 al CAN 11/500 y J1939 de flota. GALGOT caza la capa
        con ATSP y luego lee modos 01, 03, 06, 07, 09, 0A y UDS 3E.
      </p>

      {linked ? (
        <section className="stagger-in mt-5 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone="ok">{session.protocol || "Protocolo"}</StatusChip>
            {advanced?.protocolCode ? (
              <StatusChip tone="info">ATDPN {advanced.protocolCode}</StatusChip>
            ) : null}
            {live ? <StatusChip tone="info">Bus real</StatusChip> : <StatusChip tone="idle">Entrenamiento</StatusChip>}
          </div>
          <p className="mt-3 text-sm text-chrome">
            {advanced
              ? `${advanced.info.vin || session.vehicle?.vin || "SIN VIN"} · ${advanced.stored.length} guardados · ${advanced.pending.length} pendientes · ${advanced.permanent.length} permanentes`
              : "Todavía no se leyó el bloque avanzado."}
          </p>
          <PrimaryButton
            className="mt-4"
            disabled={session.busy}
            onClick={() => void session.scanAdvanced()}
          >
            <RefreshCw className="size-4" />
            {session.busy ? "Leyendo bus…" : live ? "Leer modos avanzados" : "Cargar muestra de bahía"}
          </PrimaryButton>
          {session.linkError ? <p className="mt-3 text-sm text-warn">{session.linkError}</p> : null}
        </section>
      ) : (
        <section className="stagger-in mt-5 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <p className="text-sm text-muted">
            Sin enlace no hay bitmap ni modo 06. Puedes estudiar las capas y
            después conectar el ELM.
          </p>
          <SecondaryButton className="mt-3" onClick={() => navigate({ to: "/conectar" })}>
            Conectar al vehículo
          </SecondaryButton>
        </section>
      )}

      {advanced ? (
        <div className="mt-5 space-y-3">
          <Block title="Identidad modo 09">
            <Row k="VIN" v={advanced.info.vin || "—"} mono />
            <Row k="CALID" v={advanced.info.calid || "—"} mono />
            <Row k="CVN" v={advanced.info.cvn || "—"} mono />
            <Row k="ECU" v={advanced.info.ecuName || "—"} />
          </Block>

          <Block title="Readiness · 0101">
            {advanced.readiness.length === 0 ? (
              <p className="text-sm text-muted">El ECM no devolvió 0101.</p>
            ) : (
              <ul className="space-y-2">
                {advanced.readiness.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-fg">{m.name}</span>
                    <StatusChip tone={!m.available ? "idle" : m.complete ? "ok" : "warn"}>
                      {!m.available ? "N/A" : m.complete ? "Listo" : "Pendiente"}
                    </StatusChip>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block title="DTCs 03 / 07 / 0A">
            <Row k="Guardados 03" v={advanced.stored.join(" · ") || "ninguno"} mono />
            <Row k="Pendientes 07" v={advanced.pending.join(" · ") || "ninguno"} mono />
            <Row k="Permanentes 0A" v={advanced.permanent.join(" · ") || "ninguno"} mono />
          </Block>

          <Block title="Modo 06 · tests de monitor">
            {advanced.mode06.length === 0 ? (
              <p className="text-sm text-muted">Sin MID. El clon o el ECM no publican 06.</p>
            ) : (
              <ul className="space-y-2">
                {advanced.mode06.map((t) => (
                  <li key={`${t.mid}-${t.tid}`} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-fg">{t.name}</p>
                      <p className="font-mono text-xs text-muted">
                        MID {t.mid} TID {t.tid} · {t.value} / {t.limit}
                      </p>
                    </div>
                    <StatusChip tone={t.pass ? "ok" : "bad"}>{t.pass ? "Pass" : "Fail"}</StatusChip>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block title="PIDs soportados">
            <p className="font-mono text-xs leading-relaxed text-chrome">
              {advanced.pids.length ? advanced.pids.join("  ·  ") : "Sin bitmap 0100"}
            </p>
          </Block>

          {advanced.udsAlive.length > 0 ? (
            <Block title="UDS 3E · tester present">
              <p className="text-sm text-fg">{advanced.udsAlive.join(" · ")}</p>
            </Block>
          ) : null}

          {advanced.j1939.length > 0 ? (
            <Block title="J1939 DM1">
              <p className="font-mono text-sm text-warn">{advanced.j1939.join(" · ")}</p>
            </Block>
          ) : null}
        </div>
      ) : null}

      <h2 className="mt-8 font-display text-sm tracking-[0.16em] text-muted uppercase">
        Atlas de capas
      </h2>
      <div className="mt-3 space-y-2">
        {PROTOCOL_ATLAS.map((p) => {
          const open = openId === p.id;
          const liveHit = highlighted === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpenId(open ? null : p.id)}
              className={cn(
                "w-full rounded-2xl p-4 text-left shadow-[var(--shadow-border)] transition-transform duration-150 active:scale-[0.99]",
                liveHit ? "bg-crimson text-fg" : "bg-surface text-fg",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-sm tracking-[0.12em] uppercase">{p.name}</p>
                  <p className={cn("mt-1 text-xs", liveHit ? "text-fg/80" : "text-muted")}>
                    {p.elm} · {p.baud} · pines {p.pins}
                  </p>
                </div>
                {liveHit ? <StatusChip tone="ok">Detectado</StatusChip> : null}
              </div>
              {open ? (
                <div className={cn("mt-3 space-y-1 text-sm", liveHit ? "text-fg/90" : "text-chrome")}>
                  <p>{p.paraQue}</p>
                  <p className={liveHit ? "text-fg/70" : "text-muted"}>Flota: {p.flota}</p>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <SecondaryButton className="mt-5" onClick={() => navigate({ to: linked ? "/diagnostico" : "/" })}>
        {linked ? "Volver a códigos" : "Volver al lobby"}
      </SecondaryButton>
    </AppShell>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <p className="font-display text-[11px] tracking-[0.2em] text-muted uppercase">{title}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-xs text-muted">{k}</span>
      <span className={cn("text-right text-sm text-fg", mono && "font-mono")}>{v}</span>
    </div>
  );
}
