import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  apiError,
  authorizeApiRequest,
  authorizeMutationOrigin,
} from "@/lib/api";
import {
  MAX_IMAGE_BYTES,
  removeAttachmentFile,
  saveAttachmentFile,
  supportedImageExtension,
} from "@/lib/attachments";
import { createMemoAttachment } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const originError = authorizeMutationOrigin(request);
  if (originError) return originError;
  if (!(await authorizeApiRequest())) return apiError("请先登录", 401);

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return apiError("记录 ID 无效", 400);

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) return apiError("请选择图片", 400);
  if (file.size < 1 || file.size > MAX_IMAGE_BYTES) {
    return apiError("图片大小必须在 10 MB 以内", 400);
  }

  const extension = supportedImageExtension(file.type);
  if (!extension) return apiError("仅支持 JPG、PNG、GIF 和 WebP 图片", 400);

  const localStorageKey = `${crypto.randomUUID()}${extension}`;
  const storageKey = await saveAttachmentFile(
    localStorageKey,
    new Uint8Array(await file.arrayBuffer()),
    file.type,
  );
  const attachment = await createMemoAttachment({
    memoId: id,
    filename: file.name.slice(0, 255) || `image${extension}`,
    contentType: file.type,
    byteSize: file.size,
    storageKey,
  });

  if (!attachment) {
    await removeAttachmentFile(storageKey);
    return apiError("没有找到这条记录", 404);
  }
  return NextResponse.json({ attachment }, { status: 201 });
}
