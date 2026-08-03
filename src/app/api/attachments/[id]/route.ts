import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authorizeApiRequest } from "@/lib/api";
import { streamAttachmentFile } from "@/lib/attachments";
import { getStoredMemoAttachment } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  if (!(await authorizeApiRequest())) return apiError("请先登录", 401);
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return apiError("附件 ID 无效", 400);

  const attachment = await getStoredMemoAttachment(id);
  if (!attachment) return apiError("附件不存在", 404);
  const variant = new URL(request.url).searchParams.get("variant");
  const storageKey =
    variant === "thumbnail"
      ? attachment.thumbnailStorageKey ?? attachment.storageKey
      : attachment.storageKey;

  try {
    const result = await streamAttachmentFile(
      storageKey,
      request.headers.get("if-none-match") ?? undefined,
    );
    if (!result) return apiError("附件文件缺失", 404);
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          "Cache-Control": "private, no-cache",
        },
      });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        "Content-Length": String(result.blob.size),
        "Cache-Control": "private, no-cache",
        ETag: result.blob.etag,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
      },
    });
  } catch {
    return apiError("附件文件缺失", 404);
  }
}
