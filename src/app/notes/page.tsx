import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MemoWorkspace } from "@/components/MemoWorkspace";
import { getContentCounts, listMemoPage } from "@/lib/db";
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

  const [{ memos, nextCursor }, { memoCount }] = await Promise.all([
    listMemoPage(),
    getContentCounts(),
  ]);

  return (
    <MemoWorkspace
      initialMemos={memos}
      initialNextCursor={nextCursor}
      totalMemoCount={memoCount}
      username={user.username}
    />
  );
}
