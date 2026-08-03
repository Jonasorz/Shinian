import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_BYTES,
  attachmentUploadMetadataSchema,
  isAttachmentPathForMemo,
  isAttachmentThumbnailPathForMemo,
} from "./attachment-upload";

const memoId = "2ed64279-7bbd-4c92-ae29-fd129a0ec927";

describe("attachment client upload validation", () => {
  it("accepts a supported image within the product limit", () => {
    const parsed = attachmentUploadMetadataSchema.safeParse({
      memoId,
      filename: "photo.jpg",
      contentType: "image/jpeg",
      byteSize: MAX_IMAGE_BYTES,
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects oversized or unsupported files before issuing an upload token", () => {
    expect(
      attachmentUploadMetadataSchema.safeParse({
        memoId,
        filename: "large.jpg",
        contentType: "image/jpeg",
        byteSize: MAX_IMAGE_BYTES + 1,
      }).success,
    ).toBe(false);
    expect(
      attachmentUploadMetadataSchema.safeParse({
        memoId,
        filename: "document.pdf",
        contentType: "application/pdf",
        byteSize: 1024,
      }).success,
    ).toBe(false);
  });

  it("only allows a memo to upload into its own attachment prefix", () => {
    expect(
      isAttachmentPathForMemo(
        `attachments/${memoId}/0d04dcd9-7cea-4335-83cf-430616c2ea44.jpg`,
        memoId,
      ),
    ).toBe(true);
    expect(
      isAttachmentPathForMemo(
        "attachments/73b537f2-5ced-4188-bd2e-09e95f687f0d/image.jpg",
        memoId,
      ),
    ).toBe(false);
    expect(
      isAttachmentThumbnailPathForMemo(
        `attachments/${memoId}/thumbnails/0d04dcd9-7cea-4335-83cf-430616c2ea44.webp`,
        memoId,
      ),
    ).toBe(true);
  });
});
