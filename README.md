# GALGOT Scan

**GreyhoundMovile-GalgotScan-by-iArtLabs**

Estación de diagnóstico OBD-II para **Greyhound Servicio Automotriz** (Aguascalientes, est. 1978). PWA para tablet Android — pensada para la **Blackview Active 5** y el adaptador **vLinker FS (FTDI, Vgate / FORScan)**.

Hecho por [iArtLabs](https://iartlabs.lat).

## Qué hace

- Enlace USB real al vLinker FS (chip FTDI `0403`) por WebUSB — sin driver VCP en Android.
- Handshake ELM327, DTCs, freeze frame, módulos, VIN.
- Análisis de sensores de oxígeno (B1S1 / B1S2, STFT/LTFT, osciloscopio).
- Wiki de códigos de taller en español.
- Órdenes de servicio en el dispositivo (localStorage).
- Script Python para la **PC de bahía** (`public/galgot-vlinker.py`).

Simulación de entrenamiento: solo si no hay adaptador. Con el vLinker enchufado, habla con el coche.

## Hardware de piso

| Pieza | Nota |
|---|---|
| Tablet | Blackview Active 5, USB-C host (OTG) |
| Navegador | **Chrome de Google**, no Samsung Internet ni el visor del sistema |
| Adaptador | vLinker FS USB (FTDI). Cable de **datos**, no de solo carga |
| Coche | Contacto ON, ralentí caliente para O2 |

En Android **no** se instala el driver VCP de Windows. Chrome le habla directo al FTDI. Cierra FTDI UART Terminal u otra app de puerto serie: se quedan con el USB y GALGOT no entra.

## Arranque (desarrollo)

```bash
npm install
npm run dev
```

```bash
npm run typecheck
npm run build
```

## Python en la PC (vLinker FTDI)

```bash
pip install pyserial
python public/galgot-vlinker.py --list
python public/galgot-vlinker.py
python public/galgot-vlinker.py --cmd ATI --cmd 0100 --cmd 010C --cmd 03
```

115200 8N1, DTR/RTS. En Windows sale como COMx cuando está el VCP. En Linux: `/dev/ttyUSB0` (grupo `dialout`).

## Stack

React 19 · TanStack Start · Tailwind v4 · Zustand · WebUSB FTDI · ELM327

## Licencia

© Greyhound Servicio Automotriz / iArtLabs. Uso interno de taller. Todos los derechos reservados.
