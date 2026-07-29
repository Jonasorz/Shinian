import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SearchWorkspace } from "@/components/SearchWorkspace";
import { getAllTagsWithCounts, searchMemosAndTasks } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "搜索与标签",
};

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    tag?: string;
    type?: "all" | "memo" | "task";
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const user = await currentUser();
  if (!user) {
    redirect("/login");
  }

  const { q, tag, type } = await searchParams;

  const [{ memos, tasks }, tags] = await Promise.all([
    searchMemosAndTasks({ query: q, tag, type }),
    getAllTagsWithCounts(),
  ]);

  return (
    <SearchWorkspace
      initialMemos={memos}
      initialQuery={q}
      initialTag={tag}
      initialTags={tags}
      initialTasks={tasks}
      initialType={type}
      username={user.username}
    />
  );
}
