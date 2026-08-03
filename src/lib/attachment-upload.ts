import { z } from "zod";
import {
  MAX_IMAGE_BYTES,
  SUPPORTED_IMAGE_TYPES,
} from "./attachment-constants";

export {
  MAX_IMAGE_BYTES,
  SUPPORTED_IMAGE_TYPES,
  extensionForContentType,
} from "./attachment-constants";

export const attachmentUploadMetadataSchema = z.object({
  memoId: z.string().uuid(),
  filename: z.string().trim().min(1).max(255),
  contentType: z.enum(SUPPORTED_IMAGE_TYPES),
  byteSize: z.number().int().positive().max(MAX_IMAGE_BYTES),
});

export type AttachmentUploadMetadata = z.infer<
  typeof attachmentUploadMetadataSchema
>;

export type AttachmentUploadMode = "local" | "blob";

export function attachmentUploadMode(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): AttachmentUploadMode {
  return nodeEnv === "production" ? "blob" : "local";
}

const LOCAL_STORAGE_PREFIX = "local:";

export function toLocalAttachmentStorageKey(pathname: string): string {
  return `${LOCAL_STORAGE_PREFIX}${pathname}`;
}

export function isLocalAttachmentStorageKey(storageKey: string): boolean {
  return storageKey.startsWith(LOCAL_STORAGE_PREFIX);
}

export function localAttachmentPathname(storageKey: string): string {
  if (!isLocalAttachmentStorageKey(storageKey)) {
    throw new Error("Not a local attachment storage key");
  }
  return storageKey.slice(LOCAL_STORAGE_PREFIX.length);
}

export function isAttachmentPathForMemo(
  pathname: string,
  memoId: string,
): boolean {
  const escapedMemoId = memoId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `^attachments/${escapedMemoId}/[0-9a-f-]{36}\\.(?:jpg|png|gif|webp)$`,
    "i",
  ).test(pathname);
}

export function isAttachmentThumbnailPathForMemo(
  pathname: string,
  memoId: string,
): boolean {
  const escapedMemoId = memoId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `^attachments/${escapedMemoId}/thumbnails/[0-9a-f-]{36}\\.webp$`,
    "i",
  ).test(pathname);
}
