import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MemoWorkspace } from "@/components/MemoWorkspace";
import { listMemos } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "记录",
};

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <MemoWorkspace
      initialMemos={await listMemos()}
      username={user.username}
    />
  );
}

