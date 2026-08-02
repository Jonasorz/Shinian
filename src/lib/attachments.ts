import "server-only";

import { del, get, put } from "@vercel/blob";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function supportedImageExtension(contentType: string): string | null {
  return MIME_EXTENSIONS[contentType] ?? null;
}

export async function saveAttachmentFile(
  storageKey: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  const blob = await put(`attachments/${storageKey}`, Buffer.from(bytes), {
    access: "private",
    contentType,
    addRandomSuffix: false,
  });
  return blob.pathname;
}

export async function readAttachmentFile(storageKey: string): Promise<Buffer> {
  const result = await get(storageKey, { access: "private" });
  if (!result || result.statusCode !== 200) {
    throw new Error("Attachment blob not found");
  }
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}

export async function removeAttachmentFile(storageKey: string): Promise<void> {
  await del(storageKey).catch(() => undefined);
}
