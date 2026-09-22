const WMI: Record<string, { marca: string; pista?: string }> = {
  "1GC": { marca: "Chevrolet", pista: "Silverado / Sierra" },
  "1GT": { marca: "GMC" },
  "1FT": { marca: "Ford", pista: "F-Series" },
  "1FA": { marca: "Ford" },
  "1C4": { marca: "Ram / Chrysler" },
  "1C6": { marca: "Ram" },
  "1N4": { marca: "Nissan" },
  "1N6": { marca: "Nissan", pista: "Titan / pickup" },
  "2GC": { marca: "Chevrolet" },
  "3GC": { marca: "Chevrolet" },
  "3GT": { marca: "GMC" },
  "3FA": { marca: "Ford" },
  "3N1": { marca: "Nissan", pista: "Sentra / Versa / March" },
  "3N6": { marca: "Nissan", pista: "NP300" },
  "3N8": { marca: "Nissan" },
  "3VW": { marca: "Volkswagen" },
  "JN1": { marca: "Nissan" },
  "KNA": { marca: "Kia" },
  "KMH": { marca: "Hyundai" },
  "MAJ": { marca: "Ford" },
  "93Y": { marca: "Renault" },
  "9BD": { marca: "Fiat" },
  "LSV": { marca: "Volkswagen" },
  "WDB": { marca: "Mercedes-Benz" },
  "WVW": { marca: "Volkswagen" },
  "JTD": { marca: "Toyota" },
  "5YJ": { marca: "Tesla" },
};

const YEAR: Record<string, number> = {
  A: 2010, B: 2011, C: 2012, D: 2013, E: 2014, F: 2015, G: 2016, H: 2017,
  J: 2018, K: 2019, L: 2020, M: 2021, N: 2022, P: 2023, R: 2024, S: 2025,
  T: 2026, V: 2027, W: 2028, X: 2029, Y: 2030,
};

export function decodeVin(vin: string): {
  marca: string;
  modelo: string;
  anio: number;
} {
  const v = vin.toUpperCase();
  const wmi = WMI[v.slice(0, 3)];
  const yearChar = v[9] ?? "";
  let anio = YEAR[yearChar] ?? 0;
  if (anio && anio < 2010) anio += 30;
  return {
    marca: wmi?.marca ?? "Vehículo",
    modelo: wmi?.pista ?? (v ? v.slice(0, 8) : "OBD2"),
    anio,
  };
}
