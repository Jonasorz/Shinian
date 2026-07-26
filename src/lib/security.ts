import { NextRequest } from "next/server";

export function requestIsSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  const forwardedHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProtocol =
    request.headers.get("x-forwarded-proto") ??
    (request.nextUrl.protocol === "https:" ? "https" : "http");

  if (!forwardedHost) {
    return false;
  }

  return origin === `${forwardedProtocol}://${forwardedHost}`;
}

