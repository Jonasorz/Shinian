import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authorizeApiRequest } from "@/lib/api";
import { readAttachmentFile } from "@/lib/attachments";
import { getStoredMemoAttachment } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  if (!(await authorizeApiRequest())) return apiError("请先登录", 401);
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return apiError("附件 ID 无效", 400);

  const attachment = await getStoredMemoAttachment(id);
  if (!attachment) return apiError("附件不存在", 404);

  try {
    const bytes = await readAttachmentFile(attachment.storageKey);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": attachment.contentType,
        "Content-Length": String(attachment.byteSize),
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
      },
    });
  } catch {
    return apiError("附件文件缺失", 404);
  }
}
