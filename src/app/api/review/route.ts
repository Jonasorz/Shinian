import { NextResponse } from "next/server";
import { apiError, authorizeApiRequest } from "@/lib/api";
import { getDailyReviewMemos, getYearAgoMemos } from "@/lib/db";

export async function GET(): Promise<NextResponse> {
  if (!(await authorizeApiRequest())) {
    return apiError("请先登录", 401);
  }

  const [memos, yearAgoMemos] = await Promise.all([
    getDailyReviewMemos({ limit: 8 }),
    getYearAgoMemos(),
  ]);

  return NextResponse.json({ memos, yearAgoMemos });
}
