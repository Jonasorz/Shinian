import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsWorkspace } from "@/components/SettingsWorkspace";
import { listImportBatches, listMemos, listTasks } from "@/lib/db";
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

  const [memos, tasks, batches] = await Promise.all([
    listMemos(),
    listTasks({ view: "all" }),
    listImportBatches(),
  ]);

  return (
    <SettingsWorkspace
      initialBatches={batches}
      memoCount={memos.length}
      taskCount={tasks.length}
      username={user.username}
    />
  );
}
