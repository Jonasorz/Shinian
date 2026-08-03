import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  apiError,
  authorizeApiRequest,
  authorizeMutationOrigin,
} from "@/lib/api";
import {
  MAX_IMAGE_BYTES,
  SUPPORTED_IMAGE_TYPES,
  attachmentUploadMetadataSchema,
  extensionForContentType,
  isAttachmentPathForMemo,
  isAttachmentThumbnailPathForMemo,
} from "@/lib/attachment-upload";
import { memoExists } from "@/lib/db";

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

  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return apiError("上传请求无效", 400);

  try {
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const parsed = attachmentUploadMetadataSchema.safeParse(
          JSON.parse(clientPayload ?? "null"),
        );
        if (!parsed.success || parsed.data.memoId !== id) {
          throw new Error("图片信息无效");
        }
        const extension = extensionForContentType(parsed.data.contentType);
        const isOriginal =
          Boolean(extension) &&
          pathname.toLowerCase().endsWith(extension ?? "") &&
          isAttachmentPathForMemo(pathname, id);
        const isThumbnail = isAttachmentThumbnailPathForMemo(pathname, id);
        if (!isOriginal && !isThumbnail) {
          throw new Error("图片路径无效");
        }
        if (!(await memoExists(id))) throw new Error("没有找到这条记录");

        return {
          allowedContentTypes: isThumbnail
            ? (["image/webp"] as const)
            : [...SUPPORTED_IMAGE_TYPES],
          maximumSizeInBytes: isThumbnail ? 2 * 1024 * 1024 : MAX_IMAGE_BYTES,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify(parsed.data),
        };
      },
    });
    return NextResponse.json(response);
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "无法开始图片上传",
      400,
    );
  }
}
