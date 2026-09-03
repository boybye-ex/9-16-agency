import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { chatComplete } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getPrimaryWorkspace } from "@/lib/session";

const schema = z.object({
  script: z.string().min(10),
  goal: z.string().default("more clicks"),
  length: z.enum(["15s", "30s", "60s"]).default("15s"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Paste a script to improve." }, { status: 400 });
  }

  const { script, goal, length } = parsed.data;
  const text = await chatComplete([
    {
      role: "system",
      content:
        "You improve video ad scripts for TikTok/Reels/Shorts. Keep language simple. Return HOOK / BODY / CTA sections and a rewritten script.",
    },
    {
      role: "user",
      content: `Improve this script for a ${length} video. Goal: ${goal}.\n\nSCRIPT:\n${script}`,
    },
  ]);

  const workspace = await getPrimaryWorkspace(session.user.id);
  if (workspace) {
    await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        title: `Script — ${goal}`,
        type: "SCRIPT",
        status: "ready",
        data: JSON.stringify({ script, goal, length, result: text }),
      },
    });
  }

  return NextResponse.json({ improved: text });
}
