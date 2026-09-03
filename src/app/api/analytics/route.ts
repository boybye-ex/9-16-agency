import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { analyzePerformance } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds } from "@/lib/session";
import { summarizeMetrics } from "@/lib/social";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const workspaceIds = await getUserWorkspaceIds(session.user.id);
  const accounts = await prisma.socialAccount.findMany({
    where: { workspaceId: { in: workspaceIds } },
    include: { metrics: true },
    orderBy: { platform: "asc" },
  });

  const platforms = accounts.map((account) => {
    const summary = summarizeMetrics(account.metrics);
    return {
      id: account.id,
      platform: account.platform,
      accountName: account.accountName,
      connected: account.connected,
      ...summary,
    };
  });

  const allMetrics = accounts.flatMap((a) => a.metrics);
  const overall = summarizeMetrics(allMetrics);

  const platformSummaries = platforms
    .map(
      (p) =>
        `${p.platform} (${p.accountName}): views=${p.totalViews}, engRate=${p.engagementRate}%, top posts=${p.topPosts
          .map((t) => t.title)
          .join("; ")}`,
    )
    .join("\n");

  const recommendations = await analyzePerformance({
    platformSummaries: platformSummaries || "No connected accounts yet.",
    topHours: overall.topHours,
    topDays: overall.topDays,
  });

  return NextResponse.json({
    platforms,
    overall,
    recommendations,
  });
}
