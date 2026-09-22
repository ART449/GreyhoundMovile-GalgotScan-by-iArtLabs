import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Activity, ClipboardList, PlugZap, ScanLine } from "lucide-react";
import { AppShell, StatusChip } from "@/components/shell";
import { PrimaryButton, SecondaryButton } from "@/components/ui-buttons";
import { UsbGate } from "@/components/usb-gate";
import { useGalgot } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const navigate = useNavigate();
  const { status, vehicle, mil, codes, orders, mode } = useGalgot();
  const linked = status === "linked" && vehicle;
  const last = orders[0];

  return (
    <AppShell
      eyebrow="Estación de bahía"
      status={linked ? `${vehicle.marca} ${vehicle.modelo}` : "Sin adaptador"}
      footerRight="Aguascalientes · iArtLabs"
    >
      <section className="stagger-in rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip tone={linked ? (mil ? "bad" : "ok") : "idle"}>
            {linked ? (mil ? "MIL encendido" : "Enlace estable") : "ELM327 desconectado"}
          </StatusChip>
          {linked ? (
            <StatusChip tone="info">
              {mode === "sim" ? "Entrenamiento" : mode === "ble" ? "Bluetooth" : "USB"} · {vehicle.linkMs} ms
            </StatusChip>
          ) : null}
        </div>
        <h1 className="mt-4 font-display text-4xl leading-none font-bold tracking-[0.08em] text-fg uppercase">
          Diagnóstico y enlace
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">
          Estación de bahía en tablet Android. El vLinker FS USB va al coche;
          la Active 5 habla con Chrome por OTG, no por Bluetooth clásico.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <PrimaryButton
            className="sm:flex-1"
            onClick={() => navigate({ to: "/conectar" })}
          >
            <PlugZap className="size-4" />
            Conectar al vehículo
          </PrimaryButton>
          <SecondaryButton
            className="sm:flex-1"
            onClick={() => navigate({ to: "/historial" })}
          >
            <ClipboardList className="size-4" />
            Órdenes
          </SecondaryButton>
        </div>
        <div className="mt-4">
          <UsbGate />
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link
          to="/conectar"
          className="stagger-in rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)] transition-transform duration-150 active:scale-[0.99]"
        >
          <ScanLine className="size-5 text-crimson" />
          <h2 className="mt-3 font-display text-lg tracking-[0.08em] text-fg uppercase">
            Diagnóstico
          </h2>
          <p className="mt-1 text-sm text-muted">
            Leer DTCs, freeze frame y mapa de piezas del coche enlazado.
          </p>
        </Link>
        <Link
          to={linked ? "/enlace" : "/conectar"}
          className="stagger-in rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)] transition-transform duration-150 active:scale-[0.99]"
        >
          <PlugZap className="size-5 text-chrome" />
          <h2 className="mt-3 font-display text-lg tracking-[0.08em] text-fg uppercase">
            Enlace
          </h2>
          <p className="mt-1 text-sm text-muted">
            Handshake ELM327 y ping a ECM, TCM, ABS, airbag y BCM.
          </p>
        </Link>
        <Link
          to="/orden"
          className="stagger-in rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)] transition-transform duration-150 active:scale-[0.99]"
        >
          <ClipboardList className="size-5 text-chrome" />
          <h2 className="mt-3 font-display text-lg tracking-[0.08em] text-fg uppercase">
            Orden de trabajo
          </h2>
          <p className="mt-1 text-sm text-muted">
            Los códigos leídos prellenan el diagnóstico.
          </p>
        </Link>
        <Link
          to="/oxigeno"
          className="stagger-in rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)] transition-transform duration-150 active:scale-[0.99]"
        >
          <Activity className="size-5 text-chrome" />
          <h2 className="mt-3 font-display text-lg tracking-[0.08em] text-fg uppercase">
            Sensores O2
          </h2>
          <p className="mt-1 text-sm text-muted">
            Osciloscopio delantero/trasero, trims y veredicto de mezcla.
          </p>
        </Link>
      </section>

      <section className="stagger-in mt-4 rounded-2xl bg-bg-deep p-4 shadow-[var(--shadow-border)]">
        <p className="font-display text-[11px] tracking-[0.2em] text-muted uppercase">
          Última orden
        </p>
        {last ? (
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="font-mono text-sm text-chrome">{last.id}</p>
              <p className="text-sm text-fg">
                {last.marca} {last.modelo} · {last.placas}
              </p>
            </div>
            <Link
              to="/historial"
              className="font-display text-xs tracking-[0.14em] text-crimson uppercase"
            >
              Ver historial
            </Link>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Todavía no hay órdenes en esta tablet. Cierra la primera después del
            escaneo.
          </p>
        )}
        {linked && codes.length > 0 ? (
          <p className="mt-3 font-mono text-xs text-warn">
            {codes.join(" · ")} listos para la orden
          </p>
        ) : null}
      </section>
    </AppShell>
  );
}
