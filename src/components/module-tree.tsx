import type { VehicleModule } from "@/lib/simulator";
import { cn } from "@/lib/utils";

export function ModuleTree({
  modules,
  revealed,
}: {
  modules: VehicleModule[];
  revealed: number;
}) {
  return (
    <ul className="space-y-2">
      {modules.map((mod, i) => {
        const visible = i < revealed;
        const tone =
          mod.status === "ok" ? "ok" : mod.status === "timeout" ? "warn" : "bad";
        const label =
          mod.status === "ok"
            ? `${mod.latencyMs} ms`
            : mod.status === "timeout"
              ? "Sin respuesta"
              : "Error de trama";
        return (
          <li
            key={mod.id}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-3 shadow-[var(--shadow-border)] transition-all duration-300",
              visible
                ? "translate-y-0 opacity-100"
                : "translate-y-2 opacity-0",
            )}
          >
            <div className="min-w-0">
              <p className="font-sans text-sm font-semibold text-fg">{mod.name}</p>
              <p className="truncate font-mono text-[11px] text-muted">{mod.protocol}</p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] tabular-nums",
                tone === "ok" && "bg-ok/15 text-ok",
                tone === "warn" && "bg-warn/15 text-warn",
                tone === "bad" && "bg-bad/15 text-bad",
              )}
            >
              {visible ? label : "…"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
