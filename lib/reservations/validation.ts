const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function asInt(value: unknown, min: number, max: number, label: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`${label} no es válido.`);
  return parsed;
}

export function asDate(value: unknown): string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) throw new Error('La fecha no es válida.');
  return value;
}

export function asString(value: unknown, max: number, label: string, required = true): string {
  if (typeof value !== 'string') throw new Error(`${label} no es válido.`);
  const normalized = value.trim();
  if (required && !normalized) throw new Error(`${label} es obligatorio.`);
  if (normalized.length > max) throw new Error(`${label} es demasiado largo.`);
  return normalized;
}

export function asEmail(value: unknown): string {
  const email = asString(value, 254, 'El email').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('El email no es válido.');
  return email;
}

export function asPhone(value: unknown): string {
  const phone = asString(value, 40, 'El teléfono');
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) throw new Error('El teléfono no es válido.');
  return phone;
}

export function asUuid(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${label} no es válido.`);
  }
  return value;
}
