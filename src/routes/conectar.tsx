import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bluetooth, Cable, MonitorPlay } from "lucide-react";
import { AppShell } from "@/components/shell";
import { PrimaryButton, SecondaryButton } from "@/components/ui-buttons";
import { UsbGate } from "@/components/usb-gate";
import {
  Elm327,
  bluetoothSupported,
  serialSupported,
  setElm,
  spanishSerialError,
} from "@/lib/obd/elm327";
import { isAndroid } from "@/lib/obd/host";
import { PROFILES } from "@/lib/simulator";
import { useGalgot } from "@/lib/store";
import type { LinkMode } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/conectar")({ component: Conectar });

function Conectar() {
  const navigate = useNavigate();
  const { startLink, profileId, disconnect, pushBusLog } = useGalgot();
  const [tab, setTab] = useState<"live" | "sim">("live");
  const [wire, setWire] = useState<"usb" | "ble">("usb");
  const [profile, setProfile] = useState(profileId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canSerial, setCanSerial] = useState(false);
  const [canBle, setCanBle] = useState(false);
  const [android, setAndroid] = useState(false);

  useEffect(() => {
    setCanSerial(serialSupported());
    setCanBle(bluetoothSupported());
    setAndroid(isAndroid());
    void import("web-serial-polyfill");
  }, []);

  function connectSim() {
    startLink("sim", profile);
    navigate({ to: "/enlace" });
  }

  async function connectLive(mode: LinkMode) {
    setError(null);
    setBusy(true);
    disconnect();
    const elm = new Elm327();
    elm.onLog = (line) => pushBusLog(line);
    try {
      if (mode === "ble") await elm.requestAndOpenBle();
      else await elm.requestAndOpen();
      setElm(elm);
      startLink(mode);
      navigate({ to: "/enlace" });
    } catch (err) {
      await elm.close();
      setElm(null);
      setError(spanishSerialError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      eyebrow="Diagnóstico"
      status={canSerial ? (android ? "Active 5 · USB listo" : "USB listo") : canBle ? "Bluetooth listo" : "Sin puerto"}
      footerRight="CSD taller: verificación pendiente"
    >
      <h1 className="stagger-in font-display text-4xl leading-none font-bold tracking-[0.06em] text-fg uppercase">
        Conectar al vehículo
      </h1>
      <p className="stagger-in mt-2 text-sm text-muted">
        Bahía en Blackview Active 5. El vLinker FS USB va al OBD, el USB-C a la
        tablet. No hay simulación en este camino: ATZ y los DTCs salen del coche.
      </p>

      <div className="mt-4">
        <UsbGate />
      </div>

      <div className="stagger-in mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setTab("live");
            setError(null);
          }}
          className={cn(
            "flex min-h-20 flex-col items-start justify-center rounded-2xl px-4 text-left transition-transform duration-150 active:scale-[0.98]",
            tab === "live" ? "bg-crimson text-fg" : "bg-surface text-fg shadow-[var(--shadow-border)]",
          )}
        >
          <Cable className="size-4" />
          <span className="mt-1 font-display text-sm tracking-[0.12em] uppercase">
            Coche real
          </span>
          <span className={cn("text-xs", tab === "live" ? "text-fg/80" : "text-muted")}>
            vLinker FS USB
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab("sim")}
          className={cn(
            "flex min-h-20 flex-col items-start justify-center rounded-2xl px-4 text-left transition-transform duration-150 active:scale-[0.98]",
            tab === "sim" ? "bg-crimson text-fg" : "bg-surface text-fg shadow-[var(--shadow-border)]",
          )}
        >
          <MonitorPlay className="size-4" />
          <span className="mt-1 font-display text-sm tracking-[0.12em] uppercase">
            Entrenamiento
          </span>
          <span className={cn("text-xs", tab === "sim" ? "text-fg/80" : "text-muted")}>
            Sin coche
          </span>
        </button>
      </div>

      {tab === "live" ? (
        <section className="stagger-in mt-4 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setWire("usb");
                setError(null);
              }}
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 rounded-xl font-display text-xs tracking-[0.14em] uppercase",
                wire === "usb" ? "bg-crimson text-fg" : "bg-bg-deep text-muted",
              )}
            >
              <Cable className="size-3.5" />
              USB-C OTG
            </button>
            <button
              type="button"
              onClick={() => {
                setWire("ble");
                setError(null);
              }}
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 rounded-xl font-display text-xs tracking-[0.14em] uppercase",
                wire === "ble" ? "bg-crimson text-fg" : "bg-bg-deep text-muted",
              )}
            >
              <Bluetooth className="size-3.5" />
              Bluetooth
            </button>
          </div>

          {wire === "usb" ? (
            <ol className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
              <li>1. vLinker FS al OBD del coche. Ignición ON (Start dos veces sin freno si es push).</li>
              <li>2. Cable USB-A del vLinker + <span className="text-fg">adaptador OTG USB-C</span> a la Active 5.</li>
              <li>3. Chrome de verdad, no el visor. Luz azul (USB) y verde (coche).</li>
              <li>4. Pulsa conectar y elige <span className="text-fg">FTDI / vLinker / 0403</span>.</li>
            </ol>
          ) : (
            <ol className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
              <li>1. El vLinker FS de bahía es USB, no BLE. Este camino es para un ELM Bluetooth.</li>
              <li>2. Si el clon es SPP clásico, Chrome no lo ve. Usa el USB.</li>
            </ol>
          )}

          {wire === "usb" ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs leading-relaxed text-muted">
                En la Active 5 no se instala el VCP de Windows. Chrome le habla
                directo al FTDI. Si tienes <span className="text-fg">FTDI UART Terminal</span> u otra
                app de puerto serie, ciérrala: se quedan con el USB y GALGOT no entra.
              </p>
              <a
                href="/galgot-vlinker.py"
                download
                className="inline-block text-xs text-chrome underline decoration-chrome/40 underline-offset-2"
              >
                Script Python para la PC (pyserial)
              </a>
            </div>
          ) : null}

          {!canSerial && wire === "usb" ? (
            <p className="mt-3 text-sm text-warn">
              Este navegador no expone WebUSB. En la Active 5 abre Chrome (icono de
              Google), no Samsung Internet ni el visor.
            </p>
          ) : null}
          {!canBle && wire === "ble" ? (
            <p className="mt-3 text-sm text-warn">
              Bluetooth web no está. El camino de piso es el vLinker por USB.
            </p>
          ) : null}
          {error ? <p className="mt-3 text-sm text-warn">{error}</p> : null}
          <PrimaryButton
            className="mt-4"
            disabled={busy}
            onClick={() => void connectLive(wire)}
          >
            {busy
              ? "Abriendo vLinker…"
              : wire === "ble"
                ? "Conectar Bluetooth"
                : "Conectar vLinker USB"}
          </PrimaryButton>
        </section>
      ) : (
        <section className="stagger-in mt-4 space-y-3 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <p className="text-sm text-muted">
            No habla con el coche. Solo para practicar el flujo de bahía.
          </p>
          <label className="block">
            <span className="font-display text-[11px] tracking-[0.16em] text-muted uppercase">
              Perfil de falla
            </span>
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              className="mt-1 min-h-12 w-full rounded-xl bg-bg-deep px-3 font-sans text-sm text-fg shadow-[var(--shadow-border)] outline-none focus:ring-2 focus:ring-crimson"
            >
              {PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.marca} {p.modelo} {p.anio} · {p.label.split("·")[1]?.trim() ?? p.label}
                </option>
              ))}
            </select>
          </label>
          <PrimaryButton onClick={connectSim}>Entrar en entrenamiento</PrimaryButton>
        </section>
      )}

      <SecondaryButton className="mt-3" onClick={() => navigate({ to: "/" })}>
        Volver al lobby
      </SecondaryButton>
    </AppShell>
  );
}
