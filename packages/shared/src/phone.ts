/**
 * Только 9 цифр узбекского номера без кода страны.
 * Код 998 срезаем, только если он точно код страны: строка начинается с «+» или цифр больше девяти
 * (иначе местный номер «99 8…» потерял бы первые цифры).
 */
export function phoneDigits(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("998") && (value.trim().startsWith("+") || digits.length > 9)) {
    digits = digits.slice(3);
  }
  return digits.slice(0, 9);
}

/** "901234567" → "+998 90 123-45-67" (частично, пока номер вводится) */
export function formatPhone(value: string): string {
  const d = phoneDigits(value);
  if (d.length === 0) return "";
  let out = "+998 " + d.slice(0, 2);
  if (d.length > 2) out += " " + d.slice(2, 5);
  if (d.length > 5) out += "-" + d.slice(5, 7);
  if (d.length > 7) out += "-" + d.slice(7, 9);
  return out;
}

export function isValidPhone(value: string): boolean {
  return phoneDigits(value).length === 9;
}

/** В формате E.164 для отправки на сервер: "+998901234567" */
export function toE164(value: string): string {
  return "+998" + phoneDigits(value);
}
