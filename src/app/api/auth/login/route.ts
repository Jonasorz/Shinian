import { compare } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { apiError, authorizeMutationOrigin } from "@/lib/api";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
} from "@/lib/rate-limit";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";
import { loginSchema } from "@/lib/validation";

function clientKey(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local"
  );
}

function configuredPasswordHash(): string | null {
  const encodedHash = process.env.SHINIAN_PASSWORD_HASH_B64;
  if (encodedHash) {
    try {
      return Buffer.from(encodedHash, "base64").toString("utf8");
    } catch {
      return null;
    }
  }

  return process.env.SHINIAN_PASSWORD_HASH ?? null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const originError = authorizeMutationOrigin(request);
  if (originError) {
    return originError;
  }

  const key = clientKey(request);
  const rateLimit = checkLoginRateLimit(key);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "尝试次数过多，请稍后再试" },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "登录信息无效", 400);
  }

  const expectedUsername = process.env.SHINIAN_USERNAME;
  const passwordHash = configuredPasswordHash();
  if (!expectedUsername || !passwordHash) {
    return apiError("管理员账号尚未配置", 503);
  }

  const passwordMatches = await compare(parsed.data.password, passwordHash);
  if (
    parsed.data.username !== expectedUsername ||
    !passwordMatches
  ) {
    return apiError("用户名或密码不正确", 401);
  }

  clearLoginRateLimit(key);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    SESSION_COOKIE,
    await createSessionToken(expectedUsername),
    sessionCookieOptions,
  );
  return response;
}
