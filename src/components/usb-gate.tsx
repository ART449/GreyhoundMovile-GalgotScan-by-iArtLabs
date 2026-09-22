import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { openFullTab, usbBlockedReason } from "@/lib/obd/host";
import { PrimaryButton } from "@/components/ui-buttons";

export function UsbGate() {
  const [reason, setReason] = useState<"iframe" | "webview" | null>(null);
  useEffect(() => {
    setReason(usbBlockedReason());
  }, []);
  if (!reason) return null;
  const webview = reason === "webview";
  return (
    <section className="stagger-in rounded-2xl bg-warn/15 p-4 shadow-[var(--shadow-border)]">
      <p className="font-display text-sm tracking-[0.12em] text-warn uppercase">
        {webview ? "Abre Chrome, no este visor" : "El visor bloquea el adaptador"}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-fg">
        {webview
          ? "La Active 5 tiene que hablar USB desde Chrome (el icono rojo). El visor de Grok no suelta el vLinker."
          : "Chrome no deja abrir USB dentro de este recuadro. Ábrelo en pestaña completa, ignición en ON, y conecta el vLinker ahí."}
      </p>
      <PrimaryButton className="mt-3" onClick={openFullTab}>
        <ExternalLink className="size-4" />
        Abrir en Chrome
      </PrimaryButton>
    </section>
  );
}
