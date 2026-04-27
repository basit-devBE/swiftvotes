import { randomUUID } from "node:crypto";

export function buildEventSlug(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

  return `${base || "event"}-${randomUUID().split("-")[0]}`;
}
