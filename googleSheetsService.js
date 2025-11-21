export async function fetchServiciosFromSheet(csvUrl) {
  const res = await fetch(csvUrl);
  const raw = await res.text();

  // Debug
  console.log("CSV RAW TEXT:", raw.slice(0, 500));
  const rows = raw.trim().split("\n");
  const headers = rows[0].split(",");

  const data = rows.slice(1).map((row) => {
    const cols = row.split(",");
    const item = {};
    headers.forEach((h, i) => {
      item[h.trim()] = cols[i]?.trim() || "";
    });
    return item;
  });

  console.log("Número de líneas:", data.length);
  return data;
}

// URL al script
const SCRIPT_URL =
  import.meta.env.VITE_BANDIDOS_SERVICIOS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbwjAxNebdLW7QhjlsTI44wsDtAwCmXDjykzUzc2dxtwLulXR7Dg0EzyUHPfxt1alrmOWw/exec";

/**
 * Crear servicio en Google Sheets
 */
export async function createServiceOnSheet(formValues) {
  const normalizeDate = (value) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-");
      return `${d}/${m}/${y}`;
    }
    return value;
  };

  const payload = {
    action: "create",
    Fecha: normalizeDate(formValues.date),
    Perro: formValues.dogName,
    Dueño: formValues.ownerName,
    Servicio: formValues.serviceType,
    Precio: String(formValues.price || ""),
    "Método de pago": formValues.paymentMethod,
    Groomer: formValues.groomer,
    Notas: formValues.notes || "",
  };

  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("No se pudo guardar el servicio en Google Sheets");
  }

  const data = await res.json().catch(() => ({}));
  console.log("Servicio creado:", data);
  return data;
}
