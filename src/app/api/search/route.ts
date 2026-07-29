import { NextRequest, NextResponse } from "next/server";
import { apiError, authorizeApiRequest } from "@/lib/api";
import { searchMemosAndTasks } from "@/lib/db";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!(await authorizeApiRequest())) {
    return apiError("请先登录", 401);
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const typeParam = searchParams.get("type");
  const type =
    typeParam === "memo" || typeParam === "task" ? typeParam : "all";

  const { memos, tasks } = await searchMemosAndTasks({
    query,
    tag,
    type,
  });

  return NextResponse.json({ memos, tasks });
}
