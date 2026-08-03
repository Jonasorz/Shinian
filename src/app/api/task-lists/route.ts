import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  authorizeApiRequest,
  authorizeMutationOrigin,
} from "@/lib/api";
import { createTaskList, listTaskLists } from "@/lib/db";

export async function GET(): Promise<NextResponse> {
  if (!(await authorizeApiRequest())) {
    return apiError("请先登录", 401);
  }

  return NextResponse.json({ lists: await listTaskLists() });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const originError = authorizeMutationOrigin(request);
  if (originError) return originError;
  if (!(await authorizeApiRequest())) {
    return apiError("请先登录", 401);
  }

  const body = (await request.json().catch(() => null)) as
    | { name?: unknown }
    | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) return apiError("请输入清单名称", 400);
  if (name.length > 100) return apiError("清单名称最多 100 字", 400);

  const list = await createTaskList(name);
  return NextResponse.json({ list }, { status: 201 });
}
