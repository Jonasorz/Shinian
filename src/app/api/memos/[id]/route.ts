import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  apiError,
  authorizeApiRequest,
  authorizeMutationOrigin,
} from "@/lib/api";
import { softDeleteMemo, updateMemo } from "@/lib/db";
import { updateMemoSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const idSchema = z.string().uuid();

async function memoId(context: RouteContext): Promise<string | null> {
  const { id } = await context.params;
  return idSchema.safeParse(id).success ? id : null;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const originError = authorizeMutationOrigin(request);
  if (originError) {
    return originError;
  }
  if (!(await authorizeApiRequest())) {
    return apiError("请先登录", 401);
  }

  const id = await memoId(context);
  if (!id) {
    return apiError("记录 ID 无效", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateMemoSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "内容无效", 400);
  }

  const memo = await updateMemo(id, parsed.data);
  return memo
    ? NextResponse.json({ memo })
    : apiError("没有找到这条记录", 404);
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const originError = authorizeMutationOrigin(request);
  if (originError) {
    return originError;
  }
  if (!(await authorizeApiRequest())) {
    return apiError("请先登录", 401);
  }

  const id = await memoId(context);
  if (!id) {
    return apiError("记录 ID 无效", 400);
  }

  const memo = await softDeleteMemo(id);
  return memo
    ? NextResponse.json({ memo })
    : apiError("没有找到这条记录", 404);
}

