import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  apiError,
  authorizeApiRequest,
  authorizeMutationOrigin,
} from "@/lib/api";
import {
  attachmentUploadMetadataSchema,
  extensionForContentType,
  isAttachmentPathForMemo,
  isAttachmentThumbnailPathForMemo,
} from "@/lib/attachment-upload";
import { inspectAttachmentFile } from "@/lib/attachments";
import { createMemoAttachment } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

const completionSchema = attachmentUploadMetadataSchema.extend({
  pathname: z.string().min(1).max(1024),
  thumbnailPathname: z.string().min(1).max(1024).nullable().optional(),
});

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const originError = authorizeMutationOrigin(request);
  if (originError) return originError;
  if (!(await authorizeApiRequest())) return apiError("请先登录", 401);

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return apiError("记录 ID 无效", 400);

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
