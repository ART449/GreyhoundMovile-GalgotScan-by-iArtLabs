import type { ReactNode } from "react";
import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { GreyhoundMark } from "@/components/mark";
import { cn } from "@/lib/utils";
import { WIKI_COUNT } from "@/lib/wiki";
import { useGalgot } from "@/lib/store";

export function AppShell({
  children,
  eyebrow,
  status,
  footerRight,
}: {
  children: ReactNode;
  eyebrow: string;
  status?: string;
  footerRight?: string;
}) {
  const hydrateOrders = useGalgot((s) => s.hydrateOrders);
  useEffect(() => {
    hydrateOrders();
  }, [hydrateOrders]);
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(1200px_600px_at_80%_-10%,rgba(200,16,46,0.18),transparent_55%),linear-gradient(180deg,var(--color-wall),var(--color-bg)_42%)]" />
      <div className="relative mx-auto flex min-h-dvh max-w-5xl flex-col px-4 pb-8 pt-5 sm:px-6">
        <header className="flex items-start justify-between gap-3">
          <Link to="/" className="group flex min-w-0 items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-crimson text-fg shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
              <GreyhoundMark className="h-7 w-11" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-[11px] font-semibold tracking-[0.28em] text-chrome uppercase">
                Est. 1978
              </span>
              <span className="block font-display text-2xl leading-none font-bold tracking-[0.14em] text-fg uppercase">
                Greyhound
              </span>
              <span className="block font-sans text-[11px] tracking-[0.22em] text-muted uppercase">
                Servicio Automotriz
              </span>
            </span>
          </Link>
          <div className="text-right">
            <p className="font-display text-[11px] tracking-[0.22em] text-muted uppercase">
              {eyebrow}
            </p>
            {status ? (
              <p className="mt-1 max-w-[11rem] font-sans text-xs leading-snug text-chrome">
                {status}
              </p>
            ) : null}
          </div>
        </header>
        <main className="flex flex-1 flex-col pt-6">{children}</main>
        <footer className="mt-8 flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-[11px] tracking-wide text-muted">
          <span>Núcleo diagnóstico v0.7.0</span>
          <span className="text-right">
            {footerRight ?? `CSD taller: verificación pendiente · ${WIKI_COUNT} códigos`}
          </span>
        </footer>
      </div>
    </div>
  );
}

export function StatusChip({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "bad" | "idle" | "info";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium tracking-wide uppercase",
        tone === "ok" && "bg-ok/15 text-ok",
        tone === "warn" && "bg-warn/15 text-warn",
        tone === "bad" && "bg-bad/15 text-bad",
        tone === "idle" && "bg-surface text-muted",
        tone === "info" && "bg-chrome/10 text-chrome",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "ok" && "bg-ok",
          tone === "warn" && "bg-warn",
          tone === "bad" && "bg-bad animate-[galgot-pulse_1.4s_ease-in-out_infinite]",
          tone === "idle" && "bg-muted",
          tone === "info" && "bg-chrome",
        )}
      />
      {children}
    </span>
  );
}
