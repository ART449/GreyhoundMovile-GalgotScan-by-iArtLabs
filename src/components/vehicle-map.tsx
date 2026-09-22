import { HOTSPOTS } from "@/lib/wiki";
import { cn } from "@/lib/utils";

export function VehicleMap({
  activeId,
  onSelect,
}: {
  activeId?: string;
  onSelect?: (id: string) => void;
}) {
  const spots = Object.entries(HOTSPOTS);
  return (
    <div className="relative overflow-hidden rounded-2xl bg-bg-deep p-3 shadow-[var(--shadow-border)]">
      <p className="mb-2 font-display text-[11px] tracking-[0.2em] text-muted uppercase">
        Mapa piloto · Nissan NP300
      </p>
      <svg viewBox="0 0 100 80" className="h-auto w-full" role="img" aria-label="Mapa de sensores NP300">
        <rect x="8" y="22" width="84" height="34" rx="8" className="fill-surface stroke-border" strokeWidth="0.8" />
        <rect x="14" y="14" width="28" height="16" rx="3" className="fill-surface-2 stroke-border" strokeWidth="0.7" />
        <rect x="46" y="16" width="30" height="12" rx="2" className="fill-none stroke-chrome/40" strokeWidth="0.6" />
        <circle cx="24" cy="58" r="7" className="fill-none stroke-chrome/50" strokeWidth="1.4" />
        <circle cx="76" cy="58" r="7" className="fill-none stroke-chrome/50" strokeWidth="1.4" />
        <path d="M18 39h64" className="stroke-border" strokeWidth="0.4" />
        {spots.map(([id, spot]) => {
          const on = id === activeId;
          return (
            <g key={id}>
              <circle
                cx={spot.cx}
                cy={spot.cy}
                r={on ? 4.2 : 3.2}
                className={cn(
                  "cursor-pointer transition-[r,fill,stroke]",
                  on ? "fill-crimson stroke-fg" : "fill-crimson/30 stroke-crimson",
                )}
                strokeWidth={on ? 1.2 : 0.8}
                onClick={() => onSelect?.(id)}
              />
            </g>
          );
        })}
      </svg>
      {activeId && HOTSPOTS[activeId] ? (
        <div className="mt-2 rounded-xl bg-surface px-3 py-2">
          <p className="font-sans text-sm font-semibold text-fg">
            {HOTSPOTS[activeId].label}
          </p>
          <p className="text-xs text-muted">{HOTSPOTS[activeId].zona}</p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">Toca un punto para ver la pieza.</p>
      )}
    </div>
  );
}
