import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, StatusChip } from "@/components/shell";
import { VehicleMap } from "@/components/vehicle-map";
import { PrimaryButton, SecondaryButton } from "@/components/ui-buttons";
import { HOTSPOTS, lookupDtc } from "@/lib/wiki";

export const Route = createFileRoute("/wiki/$codigo")({ component: Wiki });

function Wiki() {
  const { codigo } = Route.useParams();
  const navigate = useNavigate();
  const entry = lookupDtc(codigo);
  const [spot, setSpot] = useState(entry.hotspot);
  const tone = entry.severidad === "bad" ? "bad" : entry.severidad === "warn" ? "warn" : "ok";

  return (
    <AppShell eyebrow="E_WIKI" status={`${entry.codigo} · ${entry.sistema}`}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip tone={tone}>{entry.severidad === "bad" ? "Falla fuerte" : entry.severidad === "warn" ? "Precaución" : "Leve"}</StatusChip>
        <StatusChip tone="info">{entry.motor}</StatusChip>
      </div>
      <h1 className="mt-3 font-mono text-4xl font-semibold tracking-wide">{entry.codigo}</h1>
      <p className="mt-2 font-sans text-lg font-semibold leading-snug text-fg">
        {entry.descripcion}
      </p>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">{entry.sencillo}</p>
      <p className="mt-3 rounded-xl bg-surface px-3 py-3 text-sm text-chrome">
        Acción de taller: <span className="text-fg">{entry.accion}</span>
      </p>
      <p className="mt-2 text-sm text-muted">
        Pieza: {HOTSPOTS[entry.hotspot]?.label} · {HOTSPOTS[entry.hotspot]?.zona}
      </p>

      <div className="mt-5">
        <VehicleMap activeId={spot} onSelect={setSpot} />
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <PrimaryButton className="sm:flex-1" onClick={() => navigate({ to: "/orden" })}>
          Llevar a la orden
        </PrimaryButton>
        <SecondaryButton className="sm:flex-1" onClick={() => navigate({ to: "/diagnostico" })}>
          Seguir diagnóstico
        </SecondaryButton>
      </div>
    </AppShell>
  );
}
