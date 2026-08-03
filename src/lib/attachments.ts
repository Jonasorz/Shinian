import "server-only";

import { del, get, head } from "@vercel/blob";

export async function readAttachmentFile(storageKey: string): Promise<Buffer> {
  const result = await get(storageKey, { access: "private" });
  if (!result || result.statusCode !== 200) {
    throw new Error("Attachment blob not found");
  }
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}

export async function streamAttachmentFile(
  storageKey: string,
  ifNoneMatch?: string,
) {
  return get(storageKey, {
    access: "private",
    ifNoneMatch,
  });
}

export async function inspectAttachmentFile(storageKey: string) {
  return head(storageKey);
}

export async function removeAttachmentFile(storageKey: string): Promise<void> {
  await del(storageKey).catch(() => undefined);
}
