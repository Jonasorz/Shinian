import "server-only";

import { readAttachmentFile } from "./attachments";
import { listAllMemos, listAllTasks, listStoredMemoAttachments } from "./db";
import { createObsidianExportZip } from "./export";

export async function buildFullArchive(): Promise<Uint8Array> {
  const [memos, tasks, storedAttachments] = await Promise.all([
    listAllMemos(),
    listAllTasks(),
    listStoredMemoAttachments(),
  ]);
  const attachmentFiles = await Promise.all(
    storedAttachments.map(async (attachment) => ({
      path: `${attachment.id}_${attachment.filename.replace(/[/\\?%*:|"<>]/g, "_")}`,
      bytes: new Uint8Array(await readAttachmentFile(attachment.storageKey)),
    })),
  );
  return createObsidianExportZip(memos, tasks, attachmentFiles);
}
