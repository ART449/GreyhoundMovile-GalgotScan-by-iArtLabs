import type { ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/shell";
import { PrimaryButton, SecondaryButton } from "@/components/ui-buttons";
import { lookupDtc } from "@/lib/wiki";
import { useGalgot } from "@/lib/store";

export const Route = createFileRoute("/orden")({ component: Orden });

function Orden() {
  const navigate = useNavigate();
  const { vehicle, codes, mil, addOrder } = useGalgot();
  const [tecnico, setTecnico] = useState("Arturo");
  const [queSeHizo, setQueSeHizo] = useState("");
  const [pieza, setPieza] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);

  const diagnostico =
    codes.length === 0
      ? "Sin códigos. Revisión preventiva."
      : codes.map((c) => `${c} — ${lookupDtc(c).descripcion}`).join("\n");

  function save() {
    const order = addOrder({
      marca: vehicle?.marca ?? "",
      modelo: vehicle?.modelo ?? "",
      anio: vehicle?.anio ?? 0,
      placas: vehicle?.placas ?? "",
      vin: vehicle?.vin ?? "",
      km: vehicle?.km ?? 0,
      tecnico,
      motor: vehicle?.motor ?? "gasolina",
      diagnostico,
      queSeHizo,
      pieza,
      dtcs: codes,
      mil,
    });
    setSavedId(order.id);
  }

  const wa = (() => {
    const text = encodeURIComponent(
      `Greyhound AGS — orden ${savedId ?? "nueva"}\n${vehicle?.marca ?? ""} ${vehicle?.modelo ?? ""} ${vehicle?.placas ?? ""}\n${diagnostico}\n${queSeHizo}`,
    );
    return `https://wa.me/?text=${text}`;
  })();

  const unidad = vehicle
    ? [
        `${vehicle.marca} ${vehicle.modelo}`.trim(),
        vehicle.anio || null,
        vehicle.placas || null,
        vehicle.km ? `${vehicle.km.toLocaleString("es-MX")} km` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Sin vehículo enlazado";

  return (
    <AppShell eyebrow="Orden de trabajo" status="Greyhound AGS">
      <h1 className="font-display text-4xl font-bold tracking-[0.06em] uppercase">
        Guardar reparación
      </h1>
      <p className="mt-2 text-sm text-muted">
        Los DTCs de esta sesión prellenan el diagnóstico. Queda en esta tablet.
      </p>

      <form
        className="mt-5 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Unidad">
          <p className="rounded-xl bg-surface px-3 py-3 text-sm">{unidad}</p>
        </Field>
        <Field label="VIN">
          <p className="rounded-xl bg-surface px-3 py-3 font-mono text-sm">
            {vehicle?.vin || "—"}
          </p>
        </Field>
        <Field label="Diagnóstico">
          <textarea
            readOnly
            value={diagnostico}
            rows={3}
            className="w-full rounded-xl bg-surface px-3 py-3 text-sm text-fg shadow-[var(--shadow-border)]"
          />
        </Field>
        <label className="block">
          <span className="font-display text-[11px] tracking-[0.16em] text-muted uppercase">
            Técnico
          </span>
          <input
            value={tecnico}
            onChange={(e) => setTecnico(e.target.value)}
            className="mt-1 min-h-12 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-border)] outline-none focus:ring-2 focus:ring-crimson"
          />
        </label>
        <label className="block">
          <span className="font-display text-[11px] tracking-[0.16em] text-muted uppercase">
            Qué se hizo
          </span>
          <textarea
            value={queSeHizo}
            onChange={(e) => setQueSeHizo(e.target.value)}
            rows={3}
            placeholder="Cambio de bujías iridio, revisión de bobinas…"
            className="mt-1 w-full rounded-xl bg-surface px-3 py-3 text-sm shadow-[var(--shadow-border)] outline-none focus:ring-2 focus:ring-crimson"
          />
        </label>
        <label className="block">
          <span className="font-display text-[11px] tracking-[0.16em] text-muted uppercase">
            Pieza
          </span>
          <input
            value={pieza}
            onChange={(e) => setPieza(e.target.value)}
            placeholder="Bujías NGK · juego 4"
            className="mt-1 min-h-12 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-border)] outline-none focus:ring-2 focus:ring-crimson"
          />
        </label>
        <PrimaryButton type="submit">Guardar en el historial</PrimaryButton>
      </form>

      {savedId ? (
        <div className="mt-4 rounded-2xl bg-ok/10 p-4">
          <p className="font-display text-sm tracking-[0.12em] text-ok uppercase">
            Quedó en el historial
          </p>
          <p className="mt-1 font-mono text-lg text-fg">{savedId}</p>
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-crimson font-display text-sm tracking-[0.12em] text-fg uppercase"
          >
            WhatsApp Greyhound
          </a>
        </div>
      ) : null}

      <SecondaryButton className="mt-3" onClick={() => navigate({ to: "/historial" })}>
        Ver historial
      </SecondaryButton>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="font-display text-[11px] tracking-[0.16em] text-muted uppercase">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
