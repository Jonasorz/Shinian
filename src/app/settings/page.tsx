import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsWorkspace } from "@/components/SettingsWorkspace";
import { getContentCounts, listImportBatches } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "设置与数据导出",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/login");
  }

  const [{ memoCount, taskCount }, batches] = await Promise.all([
    getContentCounts(),
    listImportBatches(),
  ]);

  return (
    <SettingsWorkspace
      initialBatches={batches}
      memoCount={memoCount}
      taskCount={taskCount}
      username={user.username}
    />
  );
}
