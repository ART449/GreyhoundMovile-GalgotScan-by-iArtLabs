import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { SecondaryButton } from "@/components/ui-buttons";
import { useGalgot } from "@/lib/store";

export const Route = createFileRoute("/historial")({ component: Historial });

function Historial() {
  const navigate = useNavigate();
  const orders = useGalgot((s) => s.orders);

  return (
    <AppShell eyebrow="Órdenes" status={`${orders.length} en tablet`}>
      <h1 className="font-display text-4xl font-bold tracking-[0.06em] uppercase">
        Historial de bahía
      </h1>
      <p className="mt-2 text-sm text-muted">
        Se guarda en esta tablet. No sale a la nube ni se timbra desde aquí.
      </p>

      {orders.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-surface p-4 text-sm text-muted shadow-[var(--shadow-border)]">
          Aún no hay reparaciones guardadas. Cierra una orden después del
          diagnóstico.
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {orders.map((o) => (
            <li
              key={o.id}
              className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm text-crimson">{o.id}</p>
                  <p className="mt-1 font-sans text-sm font-semibold text-fg">
                    {o.marca} {o.modelo} · {o.placas || "s/p"}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(o.fecha).toLocaleString("es-MX")} · {o.tecnico}
                  </p>
                </div>
                <span className="size-2 rounded-full bg-ok" />
              </div>
              <p className="mt-2 font-mono text-xs text-chrome">
                {o.dtcs.length ? o.dtcs.join(" · ") : "Sin DTCs"}
              </p>
              {o.queSeHizo ? (
                <p className="mt-1 text-sm text-muted">{o.queSeHizo}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <SecondaryButton className="mt-6" onClick={() => navigate({ to: "/" })}>
        Volver al lobby
      </SecondaryButton>
    </AppShell>
  );
}
