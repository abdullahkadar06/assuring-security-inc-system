const STANDARD_EMAIL_REGEX =
  /^(?!.*\.\.)(?!\.)(?!.*\.$)[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function isStandardEmail(value) {
  const email = normalizeEmail(value);

  if (!email) return false;
  if (email.length > 254) return false;

  return STANDARD_EMAIL_REGEX.test(email);
}