import { NextResponse } from "next/server";
import { apiError, authorizeApiRequest } from "@/lib/api";
import { getAllTagsWithCounts } from "@/lib/db";

export async function GET(): Promise<NextResponse> {
  if (!(await authorizeApiRequest())) {
    return apiError("请先登录", 401);
  }

  const tags = await getAllTagsWithCounts();
  return NextResponse.json({ tags });
}
