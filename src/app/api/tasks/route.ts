import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  authorizeApiRequest,
  authorizeMutationOrigin,
} from "@/lib/api";
import { createTask, listTaskLists, listTasks } from "@/lib/db";
import type { TaskFilterView } from "@/lib/types";
import { createTaskSchema } from "@/lib/validation";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!(await authorizeApiRequest())) {
    return apiError("请先登录", 401);
  }

  const { searchParams } = new URL(request.url);
  const view = (searchParams.get("view") as TaskFilterView) || undefined;
  const listName = searchParams.get("listName") || undefined;

  const [tasks, lists] = await Promise.all([
    listTasks({ view, listName }),
    listTaskLists(),
  ]);

  return NextResponse.json({ tasks, lists });
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
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "任务内容无效", 400);
  }

  const task = await createTask(parsed.data);
  return NextResponse.json({ task }, { status: 201 });
}
