import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReviewWorkspace } from "@/components/ReviewWorkspace";
import { getDailyReviewMemos, getYearAgoMemos } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "每日回顾",
};

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/login");
  }

  const [initialMemos, initialYearAgoMemos] = await Promise.all([
    getDailyReviewMemos({ limit: 8 }),
    getYearAgoMemos(),
  ]);

  return (
    <ReviewWorkspace
      initialMemos={initialMemos}
      initialYearAgoMemos={initialYearAgoMemos}
      username={user.username}
    />
  );
}
