import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function seedMetricsForAccount(socialAccountId: string, platform: string) {
  const existing = await prisma.contentMetric.count({ where: { socialAccountId } });
  if (existing > 0) return;

  const titles =
    platform === "TIKTOK"
      ? ["Hook test A", "UGC stitch", "Offer flash", "Behind the ad", "POV creator"]
      : platform === "INSTAGRAM"
        ? ["Reel cut 01", "Carousel teaser", "Story highlights ad", "Product close-up", "Creator collab"]
        : ["Feed boost", "Reel remix", "Offer drop", "Brand story", "CTA experiment"];

  const rows = titles.map((title, index) => {
    const daysAgo = randomInt(1, 28);
    const hour = [11, 12, 18, 19, 20, 21][index % 6];
    const postedAt = new Date(Date.now() - daysAgo * DAY_MS);
    postedAt.setHours(hour, randomInt(0, 59), 0, 0);
    const views = randomInt(1200, 85000);
    return {
      socialAccountId,
      contentId: `${platform.toLowerCase()}-${index + 1}`,
      title,
      postedAt,
      views,
      likes: Math.floor(views * (0.04 + Math.random() * 0.08)),
      comments: Math.floor(views * (0.004 + Math.random() * 0.01)),
      shares: Math.floor(views * (0.01 + Math.random() * 0.03)),
      saves: Math.floor(views * (0.008 + Math.random() * 0.02)),
      watchTimeSec: randomInt(4, 18),
      hourOfDay: hour,
      dayOfWeek: postedAt.getDay(),
    };
  });

  await prisma.contentMetric.createMany({ data: rows });
}

export function summarizeMetrics(
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    hourOfDay: number;
    dayOfWeek: number;
    title: string;
  }[],
) {
  const totalViews = metrics.reduce((s, m) => s + m.views, 0);
  const totalEng =
    metrics.reduce((s, m) => s + m.likes + m.comments + m.shares + m.saves, 0) || 1;
  const byHour = new Map<number, number>();
  const byDay = new Map<number, number>();

  for (const m of metrics) {
    const eng = m.likes + m.comments + m.shares + m.saves;
    byHour.set(m.hourOfDay, (byHour.get(m.hourOfDay) || 0) + eng);
    byDay.set(m.dayOfWeek, (byDay.get(m.dayOfWeek) || 0) + eng);
  }

  const topHours = [...byHour.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => h);
  const topDays = [...byDay.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => d);

  const topPosts = [...metrics]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
    .map((m) => ({
      title: m.title,
      views: m.views,
      engagement: m.likes + m.comments + m.shares + m.saves,
    }));

  return {
    totalViews,
    engagementRate: Number(((totalEng / Math.max(totalViews, 1)) * 100).toFixed(2)),
    topHours,
    topDays,
    topPosts,
    hourly: [...byHour.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([hour, engagement]) => ({ hour, engagement })),
  };
}
