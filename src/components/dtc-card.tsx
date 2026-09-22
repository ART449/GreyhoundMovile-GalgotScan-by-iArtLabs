import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { DtcEntry } from "@/lib/wiki";
import { cn } from "@/lib/utils";

export function DtcCard({
  entry,
  index,
  total,
}: {
  entry: DtcEntry;
  index: number;
  total: number;
}) {
  const tone =
    entry.severidad === "bad"
      ? "bad"
      : entry.severidad === "warn"
        ? "warn"
        : "ok";
  return (
    <article
      className={cn(
        "stagger-in rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]",
        "transition-transform duration-150 ease-out active:scale-[0.99]",
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xl font-semibold tracking-wide text-fg tabular-nums">
            {entry.codigo}
          </p>
          <p className="mt-0.5 font-display text-[11px] tracking-[0.18em] text-muted uppercase">
            Taller · {entry.sistema}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase",
            tone === "bad" && "bg-bad/15 text-bad",
            tone === "warn" && "bg-warn/15 text-warn",
            tone === "ok" && "bg-ok/15 text-ok",
          )}
        >
          {index + 1} de {total}
        </span>
      </div>
      <h3 className="mt-3 font-sans text-base leading-snug font-semibold text-fg">
        {entry.descripcion}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{entry.sencillo}</p>
      <p className="mt-3 text-sm text-chrome">
        Qué revisar: <span className="text-fg">{entry.accion}</span>
      </p>
      <Link
        to="/wiki/$codigo"
        params={{ codigo: entry.codigo }}
        className="mt-4 inline-flex min-h-11 items-center gap-1.5 font-display text-sm tracking-[0.12em] text-crimson uppercase"
      >
        Explorar en E_WIKI
        <ArrowUpRight className="size-4" />
      </Link>
    </article>
  );
}
