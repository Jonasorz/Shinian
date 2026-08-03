import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  apiError,
  authorizeApiRequest,
  authorizeMutationOrigin,
} from "@/lib/api";
import {
  MAX_IMAGE_BYTES,
  attachmentUploadMetadataSchema,
  attachmentUploadMode,
  extensionForContentType,
  isAttachmentPathForMemo,
  isAttachmentThumbnailPathForMemo,
} from "@/lib/attachment-upload";
import {
  inspectAttachmentFile,
  removeAttachmentFile,
  saveLocalAttachmentFile,
} from "@/lib/attachments";
import { createMemoAttachment } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

const completionSchema = attachmentUploadMetadataSchema.extend({
  pathname: z.string().min(1).max(1024),
  thumbnailPathname: z.string().min(1).max(1024).nullable().optional(),
});

async function handleLocalUpload(
  request: NextRequest,
  memoId: string,
): Promise<NextResponse> {
  if (attachmentUploadMode() !== "local") {
    return apiError("服务器不接受本地附件上传", 400);
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const thumbnail = formData?.get("thumbnail");
  if (!(file instanceof File)) return apiError("请选择图片", 400);

  const extension = extensionForContentType(file.type);
  if (!extension || file.size < 1 || file.size > MAX_IMAGE_BYTES) {
    return apiError("仅支持 10 MB 以内的 JPG、PNG、GIF 和 WebP 图片", 400);
  }
  if (
    thumbnail !== null &&
    (!(thumbnail instanceof File) ||
      thumbnail.type !== "image/webp" ||
      thumbnail.size > 2 * 1024 * 1024)
  ) {
    return apiError("缩略图无效", 400);
  }

  const pathname = `attachments/${memoId}/${crypto.randomUUID()}${extension}`;
  const thumbnailPathname =
    thumbnail instanceof File
      ? `attachments/${memoId}/thumbnails/${crypto.randomUUID()}.webp`
      : null;
  let storageKey: string | null = null;
  let thumbnailStorageKey: string | null = null;

  try {
    storageKey = await saveLocalAttachmentFile(
      pathname,
      new Uint8Array(await file.arrayBuffer()),
    );
    if (thumbnail instanceof File && thumbnailPathname) {
      thumbnailStorageKey = await saveLocalAttachmentFile(
        thumbnailPathname,
        new Uint8Array(await thumbnail.arrayBuffer()),
      );
    }

    const attachment = await createMemoAttachment({
      memoId,
      filename: file.name.trim().slice(0, 255) || `image${extension}`,
      contentType: file.type,
      byteSize: file.size,
      storageKey,
      thumbnailStorageKey,
    });
    if (!attachment) {
      await removeAttachmentFile(storageKey);
      if (thumbnailStorageKey) await removeAttachmentFile(thumbnailStorageKey);
      return apiError("没有找到这条记录", 404);
    }
    return NextResponse.json({ attachment }, { status: 201 });
  } catch {
    if (storageKey) await removeAttachmentFile(storageKey);
    if (thumbnailStorageKey) await removeAttachmentFile(thumbnailStorageKey);
    return apiError("本地图片保存失败，请重试", 500);
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const originError = authorizeMutationOrigin(request);
  if (originError) return originError;
  if (!(await authorizeApiRequest())) return apiError("请先登录", 401);

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return apiError("记录 ID 无效", 400);

  if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    return handleLocalUpload(request, id);
  }

  const body = await request.json().catch(() => null);
  const parsed = completionSchema.safeParse(body);
  if (!parsed.success) return apiError("图片登记信息无效", 400);

  const input = parsed.data;
  const extension = extensionForContentType(input.contentType);
  if (
    input.memoId !== id ||
    !extension ||
    !input.pathname.toLowerCase().endsWith(extension) ||
    !isAttachmentPathForMemo(input.pathname, id)
  ) {
    return apiError("图片存储路径无效", 400);
  }

  try {
    const blob = await inspectAttachmentFile(input.pathname);
    if (
      blob.pathname !== input.pathname ||
      blob.size !== input.byteSize ||
      blob.contentType !== input.contentType
    ) {
      return apiError("图片信息与已上传文件不一致", 400);
    }

    if (
      input.thumbnailPathname &&
      !isAttachmentThumbnailPathForMemo(input.thumbnailPathname, id)
    ) {
      return apiError("缩略图存储路径无效", 400);
    }
    if (input.thumbnailPathname) {
      const thumbnail = await inspectAttachmentFile(input.thumbnailPathname);
      if (
        thumbnail.pathname !== input.thumbnailPathname ||
        thumbnail.contentType !== "image/webp" ||
        thumbnail.size > 2 * 1024 * 1024
      ) {
        return apiError("缩略图信息不一致", 400);
      }
    }

    const attachment = await createMemoAttachment({
      memoId: id,
      filename: input.filename,
      contentType: input.contentType,
      byteSize: input.byteSize,
      storageKey: input.pathname,
      thumbnailStorageKey: input.thumbnailPathname ?? null,
    });
    if (!attachment) return apiError("没有找到这条记录", 404);
    return NextResponse.json({ attachment }, { status: 201 });
  } catch {
    return apiError("图片尚未上传完成，请重试", 409);
  }
}
