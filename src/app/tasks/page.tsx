import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TaskWorkspace } from "@/components/TaskWorkspace";
import { listTaskLists, listTasks } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "任务",
};

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/login");
  }

  const [initialTasks, initialLists] = await Promise.all([
    listTasks(),
    listTaskLists(),
  ]);

  return (
    <TaskWorkspace
      initialLists={initialLists}
      initialTasks={initialTasks}
      username={user.username}
    />
  );
}
