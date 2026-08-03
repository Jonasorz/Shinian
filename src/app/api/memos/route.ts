import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  authorizeApiRequest,
  authorizeMutationOrigin,
} from "@/lib/api";
import { createMemo, listMemoPage } from "@/lib/db";
import {
  decodeMemoCursor,
  normalizeMemoPageSize,
} from "@/lib/memo-pagination";
import { createMemoSchema } from "@/lib/validation";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!(await authorizeApiRequest())) {
    return apiError("请先登录", 401);
  }

  const { searchParams } = new URL(request.url);
  const rawCursor = searchParams.get("cursor");
  const cursor = decodeMemoCursor(rawCursor);
  if (rawCursor && !cursor) return apiError("分页位置无效", 400);

  return NextResponse.json(
    await listMemoPage({
      cursor,
      limit: normalizeMemoPageSize(searchParams.get("limit")),
    }),
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const originError = authorizeMutationOrigin(request);
  if (originError) {
    return originError;
  }
  if (!(await authorizeApiRequest())) {
    return apiError("请先登录", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = createMemoSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "内容无效", 400);
  }

  return NextResponse.json(
    { memo: await createMemo(parsed.data.content) },
    { status: 201 },
  );
}
