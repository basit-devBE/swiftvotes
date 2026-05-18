import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, join } from "node:path";

const prisma = new PrismaClient();

const outputRoot =
  process.env.SWIFTVOTE_IMAGE_DOWNLOAD_DIR ??
  join(homedir(), "Desktop", "swiftvotespictures");

type DownloadItem = {
  kind: "nomination" | "event-flyer";
  id: string;
  eventId: string;
  label: string;
  url: string;
};

type ManifestEntry = DownloadItem & {
  filePath: string | null;
  ok: boolean;
  error?: string;
};

function safeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "image";
}

function extensionFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const extension = extname(parsed.pathname).toLowerCase();
    if (extension && extension.length <= 8) return extension;
  } catch {
    return null;
  }
  return null;
}

function extensionFromContentType(contentType: string | null): string {
  const type = contentType?.split(";")[0]?.trim().toLowerCase();
  if (type === "image/jpeg" || type === "image/jpg") return ".jpg";
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/gif") return ".gif";
  if (type === "image/svg+xml") return ".svg";
  return ".img";
}

async function download(item: DownloadItem): Promise<ManifestEntry> {
  const folder =
    item.kind === "nomination"
      ? join(outputRoot, "nominations")
      : join(outputRoot, "event-flyers");

  try {
    await mkdir(folder, { recursive: true });

    const response = await fetch(item.url, {
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    const extension =
      extensionFromUrl(item.url) ?? extensionFromContentType(contentType);
    const fileName = `${safeName(item.label)}-${item.id}${extension}`;
    const filePath = join(folder, fileName);
    const bytes = Buffer.from(await response.arrayBuffer());

    await writeFile(filePath, bytes);

    return {
      ...item,
      filePath,
      ok: true,
    };
  } catch (error) {
    return {
      ...item,
      filePath: null,
      ok: false,
      error: error instanceof Error ? error.message : "Unknown download error",
    };
  }
}

async function main(): Promise<void> {
  await mkdir(outputRoot, { recursive: true });

  const [nominations, events] = await Promise.all([
    prisma.nomination.findMany({
      where: {
        nomineeImageUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        eventId: true,
        nomineeName: true,
        nomineeImageUrl: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    prisma.event.findMany({
      where: {
        primaryFlyerUrl: {
          not: "",
        },
      },
      select: {
        id: true,
        name: true,
        primaryFlyerUrl: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);

  const items: DownloadItem[] = [
    ...nominations
      .filter((nomination) => nomination.nomineeImageUrl)
      .map((nomination) => ({
        kind: "nomination" as const,
        id: nomination.id,
        eventId: nomination.eventId,
        label: nomination.nomineeName,
        url: nomination.nomineeImageUrl!,
      })),
    ...events.map((event) => ({
      kind: "event-flyer" as const,
      id: event.id,
      eventId: event.id,
      label: event.name,
      url: event.primaryFlyerUrl,
    })),
  ];

  const manifest: ManifestEntry[] = [];
  const concurrency = Number.parseInt(process.env.DOWNLOAD_CONCURRENCY ?? "5", 10);
  const workers = Array.from({ length: Math.max(1, concurrency) }, async (_, workerIndex) => {
    for (let index = workerIndex; index < items.length; index += Math.max(1, concurrency)) {
      const item = items[index];
      const result = await download(item);
      manifest.push(result);
      const status = result.ok ? "saved" : "failed";
      console.log(`[${status}] ${item.kind} ${item.id} ${item.url}`);
    }
  });

  await Promise.all(workers);

  manifest.sort((a, b) => `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`));
  const manifestPath = join(outputRoot, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const saved = manifest.filter((entry) => entry.ok).length;
  const failed = manifest.length - saved;
  console.log(`\nDone. Saved ${saved}/${manifest.length} images to ${outputRoot}.`);
  if (failed > 0) {
    console.log(`Failed downloads: ${failed}. Check ${manifestPath}.`);
  }
}

void main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
