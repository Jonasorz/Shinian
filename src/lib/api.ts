import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "./session";
import { requestIsSameOrigin } from "./security";

export function apiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function authorizeApiRequest(): Promise<boolean> {
  return (await currentUser()) !== null;
}

export function authorizeMutationOrigin(request: NextRequest): NextResponse | null {
  return requestIsSameOrigin(request)
    ? null
    : apiError("请求来源不受信任", 403);
}

