// src/services/googleSheetsService.js
// Carga de servicios desde el CSV público de Google Sheets
// + Escritura de nuevos servicios vía Apps Script (sin tocar Código.gs)

const CSV_URL = import.meta.env.VITE_BANDIDOS_SERVICIOS_CSV_URL;
const SCRIPT_URL = import.meta.env.VITE_BANDIDOS_SERVICIOS_SCRIPT_URL;

function parseDateDMY(str) {
  if (!str) return null;
  const parts = str.split("/");
  if (parts.length !== 3) return null;

  const [d, m, y] = parts.map((n) => parseInt(n, 10));
  if (!d || !m || !y) return null;

  return new Date(y, m - 1, d);
}

// ---------------------------------------------------------------------------
// LECTURA: traer todos los servicios desde el CSV
// ---------------------------------------------------------------------------

// ─────────────────────────────────────────────
// LECTURA: traer servicios desde la hoja (CSV)
// ─────────────────────────────────────────────
export async function fetchServiciosFromSheet() {
  if (!CSV_URL) {
    throw new Error("Falta la variable VITE_BANDIDOS_SERVICIOS_CSV_URL");
  }

  const res = await fetch(CSV_URL);
  if (!res.ok) {
    throw new Error(`No se pudo descargar el CSV (${res.status})`);
  }

  const text = await res.text();
  console.log("CSV RAW TEXT (primeros 300 chars):", text.slice(0, 300));

  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const [headerLine, ...rows] = lines;
  const headers = headerLine.split(",");

  // Esperamos encabezados estilo:
  // Fecha,Perro,Dueño,Servicio,Precio,Método de pago,Groomer,Notas,...
  const idxFecha = headers.indexOf("Fecha");
  const idxPerro = headers.indexOf("Perro");
  const idxDueno = headers.indexOf("Dueño");
  const idxServicio = headers.indexOf("Servicio");
  const idxPrecio = headers.indexOf("Precio");
  const idxMetodo = headers.indexOf("Método de pago");
  const idxGroomer = headers.indexOf("Groomer");
  const idxNotas = headers.indexOf("Notas");

  const servicios = rows
    .filter((line) => line.trim() !== "")
    .map((line, index) => {
      const cols = line.split(",");

      const fecha = cols[idxFecha] ?? "";
      const perro = cols[idxPerro] ?? "";
      const dueno = cols[idxDueno] ?? "";
      const servicio = cols[idxServicio] ?? "";
      const precio = cols[idxPrecio] ?? "";
      const metodo = cols[idxMetodo] ?? "";
      const groomer = cols[idxGroomer] ?? "";
      const notas = idxNotas >= 0 ? cols[idxNotas] ?? "" : "";

      const dateObj = parseDateDMY(fecha);

      return {
        id: index + 1,
        date: fecha,
        dateObj,
        dogName: perro,
        ownerName: dueno,
        type: servicio,
        price: Number(precio) || 0,
        paymentMethod: metodo,
        groomer,
        notes: notas,
      };
    });

  console.log("fetchServiciosFromSheet ->", servicios.length, "servicios");
  return servicios;
}


// ---------------------------------------------------------------------------
// ESCRITURA: crear un nuevo servicio en la hoja de Google
// ---------------------------------------------------------------------------

export async function createServiceOnSheet(service) {
  if (!SCRIPT_URL) {
    throw new Error("VITE_BANDIDOS_SERVICIOS_SCRIPT_URL no está definida");
  }

  // Payload que espera tu Apps Script (igual al que probaste con curl)
  const payload = {
    action: "create",
    Fecha: service.date,                 // "2025-11-21"
    Perro: service.dogName,
    Dueño: service.ownerName,
    Servicio: service.type,
    Precio: String(service.price ?? 0),
    "Método de pago": service.paymentMethod,
    Groomer: service.groomer,
    Notas: service.notes || "",
  };

  console.log("[createServiceOnSheet] payload ->", payload);

  try {
    // Usamos no-cors porque no necesitamos leer la respuesta
    // y así evitamos los problemas de CORS del navegador.
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    // No intentamos leer response.json() porque en no-cors
    // la respuesta es "opaque". Si falla la red, va al catch.
  } catch (err) {
    console.error("[createServiceOnSheet] Error en fetch:", err);
    throw err;
  }
}
