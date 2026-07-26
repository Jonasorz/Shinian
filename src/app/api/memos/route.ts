import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  authorizeApiRequest,
  authorizeMutationOrigin,
} from "@/lib/api";
import { createMemo, listMemos } from "@/lib/db";
import { createMemoSchema } from "@/lib/validation";

export async function GET(): Promise<NextResponse> {
  if (!(await authorizeApiRequest())) {
    return apiError("请先登录", 401);
  }

  return NextResponse.json({ memos: await listMemos() });
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

