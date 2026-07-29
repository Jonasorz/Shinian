import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  apiError,
  authorizeApiRequest,
  authorizeMutationOrigin,
} from "@/lib/api";
import { softDeleteTask, updateTask } from "@/lib/db";
import { updateTaskSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const idSchema = z.string().uuid();

async function taskId(context: RouteContext): Promise<string | null> {
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

  const id = await taskId(context);
  if (!id) {
    return apiError("任务 ID 无效", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "修改参数无效", 400);
  }

  const task = await updateTask(id, parsed.data);
  return task
    ? NextResponse.json({ task })
    : apiError("未找到该任务", 404);
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

  const id = await taskId(context);
  if (!id) {
    return apiError("任务 ID 无效", 400);
  }

  const task = await softDeleteTask(id);
  return task
    ? NextResponse.json({ task })
    : apiError("未找到该任务", 404);
}
