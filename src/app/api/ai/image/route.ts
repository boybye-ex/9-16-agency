import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildImageUrl } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getPrimaryWorkspace } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  prompt: z.string().min(3).max(500),
  style: z.string().optional(),
  aspect: z.enum(["9:16", "1:1", "16:9"]).default("9:16"),
  projectId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Add a clearer prompt." }, { status: 400 });
  }

  const styleBit = parsed.data.style ? `, ${parsed.data.style} style` : "";
  const fullPrompt = `${parsed.data.prompt}${styleBit}, vertical social ad creative, high quality, cinematic lighting`;
  const url = buildImageUrl(fullPrompt);

  const workspace = await getPrimaryWorkspace(session.user.id);
  let projectId = parsed.data.projectId;

  if (!projectId && workspace) {
    const project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        title: parsed.data.prompt.slice(0, 60),
        type: "IMAGE",
        status: "ready",
        data: JSON.stringify({ prompt: fullPrompt, aspect: parsed.data.aspect }),
        thumbnail: url,
      },
    });
    projectId = project.id;
  }

  const asset = await prisma.asset.create({
    data: {
      projectId: projectId || null,
      userId: session.user.id,
      kind: "image",
      url,
      prompt: fullPrompt,
      meta: JSON.stringify({ aspect: parsed.data.aspect, provider: "pollinations" }),
    },
  });

  return NextResponse.json({
    id: asset.id,
    url,
    prompt: fullPrompt,
    projectId,
    provider: "pollinations",
  });
}
