function parseBirthDate(birth_date) {
  if (!birth_date) return null;
  const parts = String(birth_date).split("T")[0].split("-");
  if (parts.length !== 3) return null;
  const [yyyy, mm, dd] = parts.map(Number);
  if (!yyyy || !mm || !dd) return null;
  return { yyyy, mm, dd };
}

function todayLocal() {
  const now = new Date();
  return { yyyy: now.getFullYear(), mm: now.getMonth() + 1, dd: now.getDate() };
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Normalize Feb 29 to Feb 28 when current year is not leap
function normalizeDay(mm, dd, year) {
  if (mm === 2 && dd === 29 && !isLeapYear(year)) return { mm: 2, dd: 28 };
  return { mm, dd };
}

export function calcularEdad(birth_date) {
  const bd = parseBirthDate(birth_date);
  if (!bd) return null;
  const today = todayLocal();
  let age = today.yyyy - bd.yyyy;
  if (today.mm < bd.mm || (today.mm === bd.mm && today.dd < bd.dd)) age--;
  return age >= 0 ? age : null;
}

export function diasHastaCumple(birth_date) {
  const bd = parseBirthDate(birth_date);
  if (!bd) return null;
  const today = todayLocal();
  const norm = normalizeDay(bd.mm, bd.dd, today.yyyy);
  const nextBirthday = new Date(today.yyyy, norm.mm - 1, norm.dd);
  const todayDate = new Date(today.yyyy, today.mm - 1, today.dd);
  let diff = Math.round((nextBirthday - todayDate) / 86400000);
  if (diff < 0) {
    const nextYear = today.yyyy + 1;
    const normNext = normalizeDay(bd.mm, bd.dd, nextYear);
    const nextBirthdayNextYear = new Date(nextYear, normNext.mm - 1, normNext.dd);
    diff = Math.round((nextBirthdayNextYear - todayDate) / 86400000);
  }
  return diff;
}

export function esCumpleanosHoy(birth_date) {
  const bd = parseBirthDate(birth_date);
  if (!bd) return false;
  const today = todayLocal();
  const norm = normalizeDay(bd.mm, bd.dd, today.yyyy);
  return norm.mm === today.mm && norm.dd === today.dd;
}

export function esCumpleanosEstaSemana(birth_date) {
  const dias = diasHastaCumple(birth_date);
  return dias !== null && dias >= 1 && dias <= 7;
}

export function esCumpleanosEsteMes(birth_date) {
  const bd = parseBirthDate(birth_date);
  if (!bd) return false;
  const today = todayLocal();
  const norm = normalizeDay(bd.mm, bd.dd, today.yyyy);
  if (norm.mm !== today.mm) return false;
  const dias = diasHastaCumple(birth_date);
  return dias !== null && dias > 7;
}
