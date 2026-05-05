export function extractEventInitials(eventName: string): string {
  const initials = (eventName.match(/[a-zA-Z0-9]+/g) ?? [])
    .slice(0, 3)
    .map((word) => word.slice(0, 3).toUpperCase())
    .join("");

  return initials || "EV";
}

export function buildContestantCode(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}
