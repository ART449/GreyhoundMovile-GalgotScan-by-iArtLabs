#!/usr/bin/env python3
"""GALGOT · Greyhound — control del vLinker FS (FTDI 0x0403) por Python.

PC de bahía, no la Active 5. En Android usa GALGOT en Chrome.

    pip install pyserial
    python galgot-vlinker.py --list
    python galgot-vlinker.py
    python galgot-vlinker.py --baud 115200 --cmd ATI --cmd 0100 --cmd 03
"""

from __future__ import annotations

import argparse
import sys
import time

FTDI_VID = 0x0403
DEFAULT_BAUD = 115200
INIT = ("ATZ", "ATE0", "ATL0", "ATS0", "ATH0", "ATAL")


def need_serial():
    try:
        import serial  # noqa: F401
        from serial.tools import list_ports  # noqa: F401
    except ImportError:
        sys.stderr.write("Falta pyserial. En la PC:  pip install pyserial\n")
        sys.exit(2)
    import serial
    from serial.tools import list_ports

    return serial, list_ports


def list_adapters(list_ports) -> list:
    found = []
    for p in list_ports.comports():
        vid = p.vid or 0
        tag = "FTDI / vLinker" if vid == FTDI_VID else (p.manufacturer or "")
        found.append(p)
        print(f"  {p.device:18}  {vid:04x}:{p.pid or 0:04x}  {tag}  {p.description}")
    if not found:
        print("  (ningún puerto serie). ¿Cable USB de datos? ¿driver VCP de Windows?")
    return found


def pick_port(list_ports, wanted: str | None) -> str:
    ports = list(list_ports.comports())
    if wanted:
        return wanted
    ftdi = [p for p in ports if p.vid == FTDI_VID]
    if ftdi:
        return ftdi[0].device
    if len(ports) == 1:
        return ports[0].device
    raise SystemExit("No hay FTDI 0403. Pasa --port COM3  o  --port /dev/ttyUSB0")


def open_vlinker(serial, port: str, baud: int):
    ser = serial.Serial(
        port=port,
        baudrate=baud,
        bytesize=serial.EIGHTBITS,
        parity=serial.PARITY_NONE,
        stopbits=serial.STOPBITS_ONE,
        timeout=0.05,
        write_timeout=2,
        xonxoff=False,
        rtscts=False,
        dsrdtr=False,
    )
    try:
        ser.dtr = True
        ser.rts = True
    except Exception:
        pass
    time.sleep(0.15)
    ser.reset_input_buffer()
    return ser


def elm_cmd(ser, cmd: str, wait: float = 2.0) -> str:
    ser.reset_input_buffer()
    ser.write(f"{cmd}\r".encode("ascii", errors="ignore"))
    ser.flush()
    deadline = time.time() + wait
    buf = bytearray()
    while time.time() < deadline:
        chunk = ser.read(256)
        if chunk:
            buf.extend(chunk)
            if b">" in buf:
                break
        else:
            time.sleep(0.02)
    text = buf.decode("ascii", errors="replace").replace("\r", "\n")
    lines = [
        ln.strip()
        for ln in text.replace(">", "").split("\n")
        if ln.strip() and ln.strip().upper() != cmd.upper()
    ]
    return "\n".join(lines).strip()


def decode_rpm(raw: str) -> str:
    hexes = [int(t, 16) for t in raw.replace("\n", " ").split() if len(t) == 2]
    for i, b in enumerate(hexes[:-2]):
        if b == 0x41 and hexes[i + 1] == 0x0C:
            a, c = hexes[i + 2], hexes[i + 3]
            return f"{((a << 8) + c) / 4:.0f} rpm"
    return raw


def handshake(ser) -> str:
    ser.write(b"\r\r")
    time.sleep(0.2)
    ser.reset_input_buffer()
    ident = ""
    for cmd, wait in (("ATZ", 4.0), ("ATE0", 1.5), ("ATL0", 1.0), ("ATS0", 1.0), ("ATH0", 1.0), ("ATAL", 1.0)):
        ident = elm_cmd(ser, cmd, wait) or ident
        time.sleep(0.08)
    ati = elm_cmd(ser, "ATI", 1.5)
    return ati or ident or "(sin banner)"


def repl(ser) -> None:
    print("Comandos ELM/OBD. Vacío o 'salir' para cortar.")
    print("Ejemplos:  0100   010C   0105   03   0902   ATDP")
    while True:
        try:
            line = input("GALGOT> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not line or line.lower() in {"salir", "quit", "exit"}:
            break
        raw = elm_cmd(ser, line.upper(), 4.0 if line.upper() in {"ATZ", "03", "0902"} else 2.5)
        if line.upper().replace(" ", "") == "010C":
            print(decode_rpm(raw) or raw or "(sin respuesta)")
        else:
            print(raw or "(sin respuesta)")


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="GALGOT · vLinker FS FTDI por Python (PC)")
    p.add_argument("--list", action="store_true", help="Listar puertos USB/serie")
    p.add_argument("--port", help="COM3 / /dev/ttyUSB0 / /dev/tty.usbserial-xxxx")
    p.add_argument("--baud", type=int, default=DEFAULT_BAUD, help="115200 de fábrica del vLinker")
    p.add_argument("--cmd", action="append", default=[], help="Manda un comando y sale. Se puede repetir.")
    p.add_argument("--no-init", action="store_true", help="No mandar ATZ/ATE0 (el adaptador ya está despierto)")
    args = p.parse_args(argv)

    serial, list_ports = need_serial()

    if args.list:
        print("Puertos serie:")
        list_adapters(list_ports)
        return 0

    port = pick_port(list_ports, args.port)
    print(f"Abriendo {port} @ {args.baud} 8N1  DTR/RTS")
    ser = open_vlinker(serial, port, args.baud)
    try:
        if not args.no_init:
            ident = handshake(ser)
            print(f"Adaptador: {ident}")
        if args.cmd:
            for cmd in args.cmd:
                raw = elm_cmd(ser, cmd.upper(), 4.0)
                out = decode_rpm(raw) if cmd.upper().replace(" ", "") == "010C" else raw
                print(f">> {cmd.upper()}\n{out or '(sin respuesta)'}")
            return 0
        repl(ser)
    finally:
        ser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
