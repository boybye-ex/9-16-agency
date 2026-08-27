import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { chatComplete } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getPrimaryWorkspace } from "@/lib/session";

const schema = z.object({
  topic: z.string().min(3),
  platform: z.enum(["instagram", "tiktok", "facebook", "all"]).default("all"),
  tone: z.string().default("bold and friendly"),
  count: z.number().int().min(1).max(8).default(5),
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "Please sign out and sign in again." },
      { status: 401 },
    );
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Tell us what the post is about." }, { status: 400 });
  }

  const { topic, platform, tone, count } = parsed.data;
  const text = await chatComplete([
    {
      role: "system",
      content:
        "You write short social media captions for vertical video ads. Use simple English. Include hashtags. Number each caption. No preamble.",
    },
    {
      role: "user",
      content: `Write ${count} captions about: ${topic}. Platform: ${platform}. Tone: ${tone}. Mentions "caption" so tools know the task.`,
    },
  ]);

  const workspace = await getPrimaryWorkspace(userId);
  if (workspace) {
    await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        userId,
        title: `Captions — ${topic.slice(0, 40)}`,
        type: "CAPTION",
        status: "ready",
        data: JSON.stringify({ topic, platform, tone, result: text }),
      },
    });
  }

  return NextResponse.json({ captions: text });
}
