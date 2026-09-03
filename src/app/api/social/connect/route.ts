import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPrimaryWorkspace } from "@/lib/session";
import { seedMetricsForAccount } from "@/lib/social";

const schema = z.object({
  platform: z.enum(["INSTAGRAM", "TIKTOK", "FACEBOOK"]),
  accountName: z.string().min(2).max(80),
  accessToken: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const workspace = await getPrimaryWorkspace(session.user.id);
  if (!workspace) return NextResponse.json({ accounts: [] });

  const accounts = await prisma.socialAccount.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    accounts,
    oauthConfigured: {
      meta: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
      tiktok: Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
    },
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Pick a platform and account name." }, { status: 400 });
  }

  const workspace = await getPrimaryWorkspace(session.user.id);
  if (!workspace) {
    return NextResponse.json({ error: "No workspace found." }, { status: 400 });
  }

  const metaReady = Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
  const tiktokReady = Boolean(
    process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET,
  );

  const wantsLive =
    (parsed.data.platform !== "TIKTOK" && metaReady) ||
    (parsed.data.platform === "TIKTOK" && tiktokReady);

  const account = await prisma.socialAccount.upsert({
    where: {
      workspaceId_platform_accountName: {
        workspaceId: workspace.id,
        platform: parsed.data.platform,
        accountName: parsed.data.accountName,
      },
    },
    create: {
      workspaceId: workspace.id,
      userId: session.user.id,
      platform: parsed.data.platform,
      accountName: parsed.data.accountName,
      accessToken: parsed.data.accessToken || null,
      connected: true,
    },
    update: {
      accessToken: parsed.data.accessToken || undefined,
      connected: true,
    },
  });

  await seedMetricsForAccount(account.id, account.platform);

  return NextResponse.json({
    account,
    mode: wantsLive && parsed.data.accessToken ? "live" : "connected-with-synced-insights",
    message: wantsLive
      ? "Account linked. Add a valid access token for live API pulls."
      : "Account connected. Insights are synced for recommendations. Add Meta/TikTok app keys for live OAuth.",
  });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.socialAccount.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
