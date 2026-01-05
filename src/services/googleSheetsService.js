// src/services/googleSheetsService.js
// Carga de servicios desde el CSV público de Google Sheets
// + Escritura / borrado de servicios vía Apps Script

import Papa from "papaparse";

const CSV_URL = import.meta.env.VITE_BANDIDOS_SERVICIOS_CSV_URL;
const SCRIPT_URL = import.meta.env.VITE_BANDIDOS_SERVICIOS_SCRIPT_URL;

// ─────────────────────────────────────────────
// Helper: parsear fecha dd/MM/yyyy
// ─────────────────────────────────────────────
function parseDateDMY(str) {
  if (!str) return null;
  // Espera "dd/MM/yyyy"
  const [dd, mm, yyyy] = str.split("/");
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (isNaN(d.getTime())) return null;
  return d;
}

function formatDateToDMY(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";

  if (raw.includes("/")) return raw;

  if (raw.includes("-")) {
    const [yyyy, mm, dd] = raw.split("-");
    if (!yyyy || !mm || !dd) return raw;
    return `${dd}/${mm}/${yyyy}`;
  }

  return raw;
}

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
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors?.length) {
    console.warn("[fetchServiciosFromSheet] Errores parseando CSV:", parsed.errors);
  }

  const servicios = (parsed.data || []).map((row, index) => {
    const fecha = row["Fecha"] ?? "";
    const perro = row["Perro"] ?? "";
    const dueno = row["Dueño"] ?? "";
    const servicio = row["Servicio"] ?? "";
    const precio = row["Precio"] ?? "";
    const metodo = row["Método de pago"] ?? "";
    const groomer = row["Groomer"] ?? "";
    const notas = row["Notas"] ?? "";

    const dateObj = parseDateDMY(fecha);

    return {
      // index 0 corresponde a la fila 2 de Sheets (1 = encabezado)
      id: index + 1,
      sheetRow: index + 2,
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

  return servicios;
}

// ─────────────────────────────────────────────
// ESCRITURA: crear un nuevo servicio
// ─────────────────────────────────────────────
export async function createServiceOnSheet(service) {
  if (!SCRIPT_URL) {
    throw new Error("VITE_BANDIDOS_SERVICIOS_SCRIPT_URL no está definida");
  }

  const payload = {
    action: "create",
    Fecha: formatDateToDMY(service.date),
    Perro: service.dogName,
    Dueño: service.ownerName,
    Servicio: service.type,
    Precio: String(service.price ?? 0),
    "Método de pago": service.paymentMethod,
    Groomer: service.groomer,
    Notas: service.notes || "",
  };

  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[createServiceOnSheet] Error en fetch:", err);
    throw err;
  }
}

// ─────────────────────────────────────────────
// ESCRITURA: eliminar servicio por fila de hoja
// ─────────────────────────────────────────────
export async function deleteServiceOnSheet(sheetRow) {
  if (!SCRIPT_URL) {
    throw new Error("VITE_BANDIDOS_SERVICIOS_SCRIPT_URL no está definida");
  }

  const payload = {
    action: "delete",
    row: String(sheetRow),
  };

  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[deleteServiceOnSheet] Error en fetch:", err);
    throw err;
  }
}
