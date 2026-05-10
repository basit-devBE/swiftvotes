export function extractEventInitials(eventName: string): string {
  const initials = (eventName.match(/[a-zA-Z0-9]+/g) ?? [])
    .slice(0, 3)
    .map((word) => word.slice(0, 3).toUpperCase())
    .join("");

  return initials || "EV";
}

export function buildContestantCode(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 9999) {
    throw new RangeError("Contestant code sequence must be between 1 and 9999.");
  }
  return String(sequence).padStart(4, "0");
}
