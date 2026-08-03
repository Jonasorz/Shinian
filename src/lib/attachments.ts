import "server-only";

import { del, get, head } from "@vercel/blob";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  isLocalAttachmentStorageKey,
  localAttachmentPathname,
  toLocalAttachmentStorageKey,
} from "./attachment-upload";

type AttachmentStreamResult = {
  statusCode: 200 | 304;
  stream: ReadableStream<Uint8Array> | null;
  contentType: string;
  size: number;
  etag: string;
};

function localUploadRoot(): string {
  return path.join(process.cwd(), "uploads");
}

function safeLocalPath(pathname: string): string {
  const root = localUploadRoot();
  const resolved = path.resolve(root, pathname);
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid local attachment path");
  }
  return resolved;
}

function contentTypeForPathname(pathname: string): string {
  switch (path.extname(pathname).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

export async function saveLocalAttachmentFile(
  pathname: string,
  bytes: Uint8Array,
): Promise<string> {
  const target = safeLocalPath(pathname);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes, { flag: "wx" });
  return toLocalAttachmentStorageKey(pathname);
}

export async function readAttachmentFile(storageKey: string): Promise<Buffer> {
  if (isLocalAttachmentStorageKey(storageKey)) {
    return readFile(safeLocalPath(localAttachmentPathname(storageKey)));
  }
  const result = await get(storageKey, { access: "private" });
  if (!result || result.statusCode !== 200) {
    throw new Error("Attachment blob not found");
  }
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}

export async function streamAttachmentFile(
  storageKey: string,
  ifNoneMatch?: string,
): Promise<AttachmentStreamResult | null> {
  if (isLocalAttachmentStorageKey(storageKey)) {
    const pathname = localAttachmentPathname(storageKey);
    const target = safeLocalPath(pathname);
    const info = await stat(target);
    const etag = `\"${createHash("sha1")
      .update(`${info.size}:${info.mtimeMs}`)
      .digest("hex")}\"`;
    if (ifNoneMatch === etag) {
      return {
        statusCode: 304,
        stream: null,
        contentType: contentTypeForPathname(pathname),
        size: info.size,
        etag,
      };
    }
    const bytes = await readFile(target);
    return {
      statusCode: 200,
      stream: new Blob([bytes]).stream(),
      contentType: contentTypeForPathname(pathname),
      size: bytes.byteLength,
      etag,
    };
  }

  const result = await get(storageKey, {
    access: "private",
    ifNoneMatch,
  });
  if (!result) return null;
  return {
    statusCode: result.statusCode,
    stream: result.statusCode === 304 ? null : result.stream,
    contentType: result.blob.contentType ?? "application/octet-stream",
    size: result.blob.size ?? 0,
    etag: result.blob.etag,
  };
}

export async function inspectAttachmentFile(storageKey: string) {
  return head(storageKey);
}

export async function removeAttachmentFile(storageKey: string): Promise<void> {
  if (isLocalAttachmentStorageKey(storageKey)) {
    await unlink(safeLocalPath(localAttachmentPathname(storageKey))).catch(
      () => undefined,
    );
    return;
  }
  await del(storageKey).catch(() => undefined);
}
