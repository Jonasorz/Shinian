import { timingSafeEqual } from "node:crypto";
import { del, list, put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { buildFullArchive } from "@/lib/archive";

export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || !supplied) return false;
  const expected = Buffer.from(secret);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!process.env.CRON_SECRET) return apiError("备份任务尚未配置", 503);
  if (!authorized(request)) return apiError("无权执行备份任务", 401);
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return apiError("Vercel Blob 尚未配置", 503);
  }

  const archive = await buildFullArchive();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const blob = await put(`backups/shinian-${timestamp}.zip`, Buffer.from(archive), {
    access: "private",
    contentType: "application/zip",
    addRandomSuffix: false,
  });

  const retentionDays = Math.max(
    1,
    Math.min(365, Number(process.env.BACKUP_RETENTION_DAYS) || 30),
  );
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const existing = await list({ prefix: "backups/", limit: 1000 });
  const expired = existing.blobs
    .filter((item) => item.uploadedAt.getTime() < cutoff)
    .map((item) => item.pathname);
  if (expired.length > 0) await del(expired);

  return NextResponse.json({ backedUp: true, pathname: blob.pathname });
}
