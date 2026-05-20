export const MOMO_PROVIDER_PREFIXES = {
  mtn: ["024", "025", "053", "054", "055", "059"],
  vodafone: ["020", "050"],
  airteltigo: ["026", "027", "056", "057"],
} as const;

export type MomoProvider = keyof typeof MOMO_PROVIDER_PREFIXES;

export function normalizeGhanaPhoneForValidation(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) return digits;
  if (/^233\d{9}$/.test(digits)) return `0${digits.slice(3)}`;
  return null;
}

export function phoneMatchesMomoProvider(
  phone: string,
  provider: MomoProvider,
): boolean {
  const normalized = normalizeGhanaPhoneForValidation(phone);
  if (!normalized) return false;
  return MOMO_PROVIDER_PREFIXES[provider].some((prefix) =>
    normalized.startsWith(prefix),
  );
}

export function momoProviderPhoneMessage(provider: MomoProvider): string {
  if (provider === "mtn") {
    return "MTN numbers must start with 024, 025, 053, 054, 055, or 059.";
  }
  if (provider === "vodafone") {
    return "Telecel numbers must start with 020 or 050.";
  }
  return "AirtelTigo numbers must start with 026, 027, 056, or 057.";
}
