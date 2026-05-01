export function extractEventInitials(eventName: string): string {
  const initials = eventName
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w[0].toUpperCase())
    .join("");

  return initials || "EV";
}

export function buildContestantCode(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}
