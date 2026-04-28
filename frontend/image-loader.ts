export default function imageLoader({
  src,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  // All images are returned as-is.
  // - External URLs (S3, CDN): browser fetches directly, no Next.js server proxy.
  // - Local /public paths: served as static files by Next.js.
  // This avoids the server-side download timeout for large user-uploaded files.
  return src;
}
