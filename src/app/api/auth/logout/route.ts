import { NextRequest, NextResponse } from "next/server";
import { authorizeMutationOrigin } from "@/lib/api";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const originError = authorizeMutationOrigin(request);
  if (originError) {
    return originError;
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions,
    maxAge: 0,
  });
  return response;
}

