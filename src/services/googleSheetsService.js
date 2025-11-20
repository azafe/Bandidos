import Papa from "papaparse";

const CSV_URL = import.meta.env.VITE_BANDIDOS_SERVICIOS_CSV_URL;

/**
 * Lee el CSV publicado de Google Sheets y lo mapea
 * al formato de "servicio" que usa el panel.
 */
export async function fetchServiciosFromSheet() {
  if (!CSV_URL) {
    throw new Error("No está definida VITE_BANDIDOS_SERVICIOS_CSV_URL");
  }

  const response = await fetch(CSV_URL);
  if (!response.ok) {
    throw new Error("No se pudo descargar el CSV de Servicios");
  }

  const csvText = await response.text();

   // 👉 LOG 1: Ver texto crudo del CSV
  console.log("📄 CSV RAW TEXT:", csvText.substring(0, 300) + "...");
  
  // 👉 LOG 2: Ver número de líneas
  console.log("🔢 Número de líneas:", csvText.split("\n").length);
  
  
  // Parsear CSV
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  // Ajusta los nombres de columnas EXACTAMENTE a como están en tu hoja
  return parsed.data.map((row, index) => ({
    id: index + 1, // ID simple por ahora
    fecha: row["Fecha"] || "",
    perro: row["Perro"] || "",
    dueno: row["Dueño"] || row["Dueno"] || "",
    servicio: row["Servicio"] || "",
    precio: Number(row["Precio"] || 0),
    metodoPago: row["Método de pago"] || row["Metodo de pago"] || "",
    groomer: row["Groomer"] || "",
    notas: row["Notas"] || "",
  }));
}

