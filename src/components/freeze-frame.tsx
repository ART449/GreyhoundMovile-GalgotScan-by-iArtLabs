import type { FreezeFrame } from "@/lib/simulator";

const CELLS: { key: keyof FreezeFrame; label: string; fmt: (n: number) => string }[] = [
  { key: "rpm", label: "RPM", fmt: (n) => n.toLocaleString("es-MX") },
  { key: "velocidad", label: "Velocidad", fmt: (n) => `${n} km/h` },
  { key: "tempRefrigerante", label: "Temp. refrigerante", fmt: (n) => `${n} °C` },
  { key: "cargaMotor", label: "Carga del motor", fmt: (n) => `${n.toFixed(1)} %` },
  { key: "presionMap", label: "Presión MAP", fmt: (n) => `${n} kPa` },
  { key: "voltajeBateria", label: "Voltaje batería", fmt: (n) => `${n.toFixed(1)} V` },
];

export function FreezeFrameGrid({
  frame,
  code,
  live,
  real,
}: {
  frame: FreezeFrame;
  code?: string;
  live?: boolean;
  real?: boolean;
}) {
  return (
    <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <p className="font-display text-[11px] tracking-[0.2em] text-muted uppercase">
        {live ? "PIDs en vivo" : "Freeze frame · capturado"}
      </p>
      {code ? (
        <p className="mt-1 text-sm text-chrome">
          {live ? "El ECM no tenía freeze; estos son valores actuales" : `Parámetros al momento de la falla — ${code}`}
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CELLS.map((cell) => (
          <div key={cell.key} className="rounded-xl bg-bg-deep px-3 py-3">
            <p className="font-display text-[10px] tracking-[0.16em] text-muted uppercase">
              {cell.label}
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-fg tabular-nums">
              {cell.fmt(frame[cell.key])}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        {real
          ? live
            ? "Lectura modo 01 del bus. No es el instante de la falla."
            : "Lectura modo 02 (freeze frame) del ECM."
          : "Valores de entrenamiento. En USB se leen del ECM."}
      </p>
    </section>
  );
}
