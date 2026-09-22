export type Severidad = "ok" | "warn" | "bad";

export type DtcEntry = {
  codigo: string;
  descripcion: string;
  sencillo: string;
  severidad: Severidad;
  accion: string;
  hotspot: string;
  sistema: string;
  motor: "gasolina" | "diesel" | "ambos";
};

export const HOTSPOTS: Record<
  string,
  { label: string; zona: string; cx: number; cy: number }
> = {
  maf: { label: "Sensor MAF", zona: "Admisión / cofre", cx: 42, cy: 38 },
  o2_pre: { label: "O2 delantero", zona: "Escape / cofre", cx: 58, cy: 62 },
  o2_post: { label: "O2 trasero", zona: "Escape", cx: 78, cy: 68 },
  coil_1: { label: "Bobina / bujía cil. 1", zona: "Cofre motor", cx: 36, cy: 48 },
  thermostat: { label: "Termostato", zona: "Cofre", cx: 30, cy: 42 },
  battery: { label: "Batería / carga", zona: "Cofre", cx: 22, cy: 36 },
  gas_cap: { label: "Tapón / EVAP", zona: "Tanque", cx: 86, cy: 48 },
  map_sensor: { label: "Sensor MAP", zona: "Cofre", cx: 48, cy: 44 },
  alt: { label: "Alternador", zona: "Cofre", cx: 28, cy: 54 },
  air_filter: { label: "Filtro de aire", zona: "Cofre", cx: 18, cy: 46 },
  turbo: { label: "Turbo", zona: "Cofre", cx: 40, cy: 56 },
  egr: { label: "Válvula EGR", zona: "Cofre", cx: 50, cy: 52 },
  dpf: { label: "Filtro DPF", zona: "Escape", cx: 70, cy: 64 },
  fuel_rail: { label: "Riel de combustible", zona: "Cofre", cx: 44, cy: 40 },
  glow: { label: "Bujías incandescentes", zona: "Cofre motor", cx: 38, cy: 50 },
  general: { label: "Revisión general", zona: "Centro", cx: 50, cy: 50 },
};

const WIKI: DtcEntry[] = [
  {
    codigo: "P0128",
    descripcion: "Termostato — temperatura de refrigerante baja",
    sencillo:
      "El motor tarda en calentar. Casi siempre es el termostato pegado abierto. Gasta más combustible en frío.",
    severidad: "warn",
    accion: "Reemplazo de termostato",
    hotspot: "thermostat",
    sistema: "Enfriamiento",
    motor: "ambos",
  },
  {
    codigo: "P0133",
    descripcion: "Sensor de oxígeno lento (banco 1, sensor 1)",
    sencillo:
      "El sensor que mide la mezcla responde lento por viejo o sucio. Sube el consumo poco a poco.",
    severidad: "warn",
    accion: "Reemplazo de sensor de oxígeno",
    hotspot: "o2_pre",
    sistema: "Emisiones",
    motor: "gasolina",
  },
  {
    codigo: "P0130",
    descripcion: "Circuito del sensor de oxígeno (banco 1, sensor 1)",
    sencillo:
      "El delantero no entrega una señal limpia. Conector, cable o el propio sensor. Sin él el ECM adivina la mezcla.",
    severidad: "warn",
    accion: "Prueba de circuito y reemplazo de O2 delantero",
    hotspot: "o2_pre",
    sistema: "Emisiones",
    motor: "gasolina",
  },
  {
    codigo: "P0131",
    descripcion: "Sensor de oxígeno — voltaje bajo (banco 1, sensor 1)",
    sencillo:
      "Se quedó pobre. A veces es fuga de escape antes del sensor, no el sensor. Huele y escucha fugas primero.",
    severidad: "warn",
    accion: "Buscar fugas de escape y vacío; luego el O2",
    hotspot: "o2_pre",
    sistema: "Emisiones",
    motor: "gasolina",
  },
  {
    codigo: "P0132",
    descripcion: "Sensor de oxígeno — voltaje alto (banco 1, sensor 1)",
    sencillo:
      "Se quedó rico. Corto a 12 V, inyector goteando o sensor viciado.",
    severidad: "warn",
    accion: "Medir voltaje del O2 y revisar inyectores",
    hotspot: "o2_pre",
    sistema: "Emisiones",
    motor: "gasolina",
  },
  {
    codigo: "P0134",
    descripcion: "Sensor de oxígeno — sin actividad (banco 1, sensor 1)",
    sencillo:
      "No oscila. Calentador muerto, cable cortado o sensor acabado. El motor corre en lazo abierto.",
    severidad: "bad",
    accion: "Prueba de calentador y reemplazo de O2 delantero",
    hotspot: "o2_pre",
    sistema: "Emisiones",
    motor: "gasolina",
  },
  {
    codigo: "P0135",
    descripcion: "Calentador del sensor de oxígeno (banco 1, sensor 1)",
    sencillo:
      "La resistencia que calienta el O2 se abrió. Tarda en entrar en lazo cerrado. Fusible o el sensor.",
    severidad: "warn",
    accion: "Medir resistencia del calentador (típicamente 4–10 Ω)",
    hotspot: "o2_pre",
    sistema: "Emisiones",
    motor: "gasolina",
  },
  {
    codigo: "P0136",
    descripcion: "Circuito del sensor de oxígeno (banco 1, sensor 2)",
    sencillo:
      "El trasero, después del catalizador, no habla. No regula mezcla: sirve para vigilar el gato.",
    severidad: "warn",
    accion: "Prueba de circuito O2 trasero",
    hotspot: "o2_post",
    sistema: "Emisiones",
    motor: "gasolina",
  },
  {
    codigo: "P0138",
    descripcion: "Sensor de oxígeno — voltaje alto (banco 1, sensor 2)",
    sencillo:
      "El post-cat se quedó alto. A veces es el sensor, a veces el gato saturado de combustible por una falla de encendido previa.",
    severidad: "warn",
    accion: "Revisar O2 trasero y si hubo P0300 reciente",
    hotspot: "o2_post",
    sistema: "Emisiones",
    motor: "gasolina",
  },
  {
    codigo: "P0141",
    descripcion: "Calentador del sensor de oxígeno (banco 1, sensor 2)",
    sencillo:
      "El calentador del trasero falló. No te deja tirado, pero enciende el MIL y no pasas verificación.",
    severidad: "ok",
    accion: "Reemplazo de O2 trasero (calentador integrado)",
    hotspot: "o2_post",
    sistema: "Emisiones",
    motor: "gasolina",
  },
  {
    codigo: "P2270",
    descripcion: "Sensor O2 post-cat pegado pobre (banco 1)",
    sencillo:
      "El trasero no sale de mezcla pobre. Escape con fuga entre gato y sensor, o el sensor ya no vale.",
    severidad: "warn",
    accion: "Fugas de escape post-cat y prueba de O2 trasero",
    hotspot: "o2_post",
    sistema: "Emisiones",
    motor: "gasolina",
  },
  {
    codigo: "P0171",
    descripcion: "Mezcla pobre (banco 1)",
    sencillo:
      "Entra más aire del que debe: fuga de vacío o sensor MAF sucio. Sube el consumo de gasolina.",
    severidad: "warn",
    accion: "Prueba de fugas de vacío y limpieza de MAF",
    hotspot: "maf",
    sistema: "Combustible",
    motor: "gasolina",
  },
  {
    codigo: "P0172",
    descripcion: "Mezcla rica (banco 1)",
    sencillo:
      "El ECM está quitando gasolina y aún así queda rico. Inyector goteando, presión alta u O2 delantero mentiroso.",
    severidad: "warn",
    accion: "Revisar inyectores, presión y O2 delantero",
    hotspot: "fuel_rail",
    sistema: "Combustible",
    motor: "gasolina",
  },
  {
    codigo: "P0174",
    descripcion: "Mezcla pobre (banco 2)",
    sencillo:
      "Igual que P0171 pero del otro lado del motor. Cuando salen juntos, casi seguro es fuga de vacío o MAF.",
    severidad: "warn",
    accion: "Prueba de fugas de vacío",
    hotspot: "maf",
    sistema: "Combustible",
    motor: "gasolina",
  },
  {
    codigo: "P0300",
    descripcion: "Fallo de encendido aleatorio / múltiples cilindros",
    sencillo:
      "Se sintieron varios cilindros fallando, no uno solo fijo. Revisar bujías, bobinas y mezcla antes de tocar la computadora.",
    severidad: "bad",
    accion: "Revisión de sistema de encendido completo",
    hotspot: "coil_1",
    sistema: "Encendido",
    motor: "gasolina",
  },
  {
    codigo: "P0301",
    descripcion: "Falla de encendido en cilindro 1",
    sencillo:
      "El motor está tosiendo en un cilindro. Suele ser bujía o bobina. Atiéndelo pronto para no dañar el catalizador.",
    severidad: "bad",
    accion: "Revisión de bujía/bobina cilindro 1",
    hotspot: "coil_1",
    sistema: "Encendido",
    motor: "gasolina",
  },
  {
    codigo: "P0302",
    descripcion: "Falla de encendido en cilindro 2",
    sencillo:
      "Un cilindro no está quemando bien. Se siente vibración. Bujía o bobina son lo más común.",
    severidad: "bad",
    accion: "Revisión de bujía/bobina cilindro 2",
    hotspot: "coil_1",
    sistema: "Encendido",
    motor: "gasolina",
  },
  {
    codigo: "P0420",
    descripcion: "Eficiencia del catalizador bajo el umbral (banco 1)",
    sencillo:
      "El catalizador ya no limpia los gases como debe. No te va a dejar tirado, pero no pasas verificación y contamina.",
    severidad: "warn",
    accion: "Diagnóstico de catalizador y sensores de oxígeno",
    hotspot: "o2_post",
    sistema: "Emisiones",
    motor: "ambos",
  },
  {
    codigo: "P0442",
    descripcion: "Fuga pequeña en sistema EVAP",
    sencillo:
      "Fuga chiquita de vapores de gasolina. Muchas veces es el tapón del tanque mal cerrado o su empaque.",
    severidad: "ok",
    accion: "Revisar tapón de gasolina primero",
    hotspot: "gas_cap",
    sistema: "EVAP",
    motor: "gasolina",
  },
  {
    codigo: "P0562",
    descripcion: "Voltaje del sistema bajo",
    sencillo:
      "La batería o el alternador andan flojos. Si lo dejas, un día no enciende.",
    severidad: "warn",
    accion: "Prueba de batería y alternador",
    hotspot: "battery",
    sistema: "Carga",
    motor: "ambos",
  },
  {
    codigo: "P0087",
    descripcion: "Presión de riel de combustible baja",
    sencillo:
      "La bomba no está dando la presión que el motor pide. Se siente falta de potencia. Puede ser filtro tapado o bomba.",
    severidad: "bad",
    accion: "Revisión de filtro y bomba de alta presión",
    hotspot: "fuel_rail",
    sistema: "Combustible",
    motor: "diesel",
  },
  {
    codigo: "P0299",
    descripcion: "Turbo — presión baja (underboost)",
    sencillo:
      "El turbo no está empujando lo que debe: fuga en mangueras o geometría variable pegada. Se siente lento.",
    severidad: "warn",
    accion: "Inspección de turbo y mangueras",
    hotspot: "turbo",
    sistema: "Admisión",
    motor: "diesel",
  },
  {
    codigo: "P0380",
    descripcion: "Circuito de bujías incandescentes",
    sencillo:
      "Las bujías de precalentamiento fallan. En frío va a costar trabajo encender.",
    severidad: "warn",
    accion: "Prueba de bujías incandescentes y relevador",
    hotspot: "glow",
    sistema: "Arranque",
    motor: "diesel",
  },
  {
    codigo: "P0401",
    descripcion: "Flujo EGR insuficiente",
    sencillo:
      "La recirculación de gases está baja, casi siempre por carbón acumulado en la válvula. Una limpieza lo resuelve.",
    severidad: "warn",
    accion: "Limpieza/reemplazo de válvula EGR",
    hotspot: "egr",
    sistema: "Emisiones",
    motor: "diesel",
  },
  {
    codigo: "P2002",
    descripcion: "Filtro de partículas (DPF) — eficiencia baja",
    sencillo:
      "El filtro de hollín está saturado. Necesita regeneración forzada. Si no se atiende: pierde potencia y gasta más.",
    severidad: "bad",
    accion: "Regeneración forzada de DPF",
    hotspot: "dpf",
    sistema: "Emisiones",
    motor: "diesel",
  },
  {
    codigo: "P20E8",
    descripcion: "Presión baja de AdBlue/DEF (SCR)",
    sencillo:
      "El sistema de urea anda bajo de presión. Si se ignora, el sistema puede limitar la potencia por norma de emisiones.",
    severidad: "warn",
    accion: "Revisión de bomba e inyector de AdBlue",
    hotspot: "dpf",
    sistema: "Emisiones",
    motor: "diesel",
  },
  {
    codigo: "P2463",
    descripcion: "DPF — acumulación excesiva de hollín",
    sencillo:
      "El filtro está tapado más allá de lo que una regeneración normal resuelve. Urge atención antes de que entre en modo de emergencia.",
    severidad: "bad",
    accion: "Regeneración forzada o limpieza de DPF",
    hotspot: "dpf",
    sistema: "Emisiones",
    motor: "diesel",
  },
  {
    codigo: "P0101",
    descripcion: "Sensor MAF — rango/rendimiento",
    sencillo:
      "El medidor de aire no cuadra con lo que el motor espera. Filtro sucio o sensor sucio son lo primero.",
    severidad: "warn",
    accion: "Limpieza de MAF y filtro de aire",
    hotspot: "maf",
    sistema: "Admisión",
    motor: "gasolina",
  },
  {
    codigo: "P0113",
    descripcion: "Sensor IAT — señal alta",
    sencillo:
      "La computadora cree que el aire de admisión está helado. Conector flojo o sensor abierto.",
    severidad: "warn",
    accion: "Revisar conector y sensor de temperatura de aire",
    hotspot: "air_filter",
    sistema: "Admisión",
    motor: "ambos",
  },
  {
    codigo: "P0325",
    descripcion: "Sensor de detonación (knock) banco 1",
    sencillo:
      "No está oyendo el pistoneo. Puede retrasar el tiempo y sentirse flojo. Revisa arnés y sensor.",
    severidad: "warn",
    accion: "Inspección de sensor knock y arnés",
    hotspot: "general",
    sistema: "Encendido",
    motor: "gasolina",
  },
  {
    codigo: "P0500",
    descripcion: "Sensor de velocidad del vehículo",
    sencillo:
      "El velocímetro o el ABS pueden fallar. Afecta cambios automáticos y control de crucero.",
    severidad: "warn",
    accion: "Prueba de sensor de velocidad y anillo reluctor",
    hotspot: "general",
    sistema: "Transmisión",
    motor: "ambos",
  },
  {
    codigo: "P0700",
    descripcion: "Falla en el módulo de transmisión (TCM)",
    sencillo:
      "La caja pidió atención. Este código es un letrero: hay que leer los códigos de transmisión aparte.",
    severidad: "bad",
    accion: "Leer códigos de transmisión y revisar nivel de ATF",
    hotspot: "general",
    sistema: "Transmisión",
    motor: "ambos",
  },
  {
    codigo: "P0455",
    descripcion: "Fuga grande en sistema EVAP",
    sencillo:
      "Fuga gorda de vapores. Tapón flojo, manguera rota o canister. Huele a gasolina a veces.",
    severidad: "warn",
    accion: "Prueba de humo EVAP y tapón de tanque",
    hotspot: "gas_cap",
    sistema: "EVAP",
    motor: "gasolina",
  },
  {
    codigo: "P0106",
    descripcion: "Sensor MAP — rango/rendimiento",
    sencillo:
      "La presión del múltiple no cuadra. Manguera del MAP suelta o sensor sucio.",
    severidad: "warn",
    accion: "Revisar manguera y sensor MAP",
    hotspot: "map_sensor",
    sistema: "Admisión",
    motor: "ambos",
  },
  {
    codigo: "P0234",
    descripcion: "Turbo — sobrepresión (overboost)",
    sencillo:
      "El turbo está empujando de más. Wastegate pegada o sensor de boost. Puede dañar el motor si se ignora.",
    severidad: "bad",
    accion: "Inspección de wastegate y sensor de boost",
    hotspot: "turbo",
    sistema: "Admisión",
    motor: "diesel",
  },
  {
    codigo: "P0670",
    descripcion: "Módulo de bujías incandescentes",
    sencillo:
      "El módulo que alimenta las bujías de calentamiento no responde. Arranque en frío difícil.",
    severidad: "warn",
    accion: "Prueba de módulo y fusible de glow plugs",
    hotspot: "glow",
    sistema: "Arranque",
    motor: "diesel",
  },
];

const BY_CODE = new Map(WIKI.map((d) => [d.codigo, d]));

export const WIKI_COUNT = WIKI.length;

export function lookupDtc(codigo: string): DtcEntry {
  const found = BY_CODE.get(codigo.toUpperCase());
  if (found) return found;
  return {
    codigo: codigo.toUpperCase(),
    descripcion: "Código sin ficha local",
    sencillo:
      "Este código no está en la ficha de taller todavía. Anótalo en la orden y consulta el manual de la marca.",
    severidad: "warn",
    accion: "Registrar en la orden y contrastar con el manual",
    hotspot: "general",
    sistema: "General",
    motor: "ambos",
  };
}

export function wikiSize(): number {
  return WIKI.length;
}

export function allCodes(): DtcEntry[] {
  return WIKI;
}
