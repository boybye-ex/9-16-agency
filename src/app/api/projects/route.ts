import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPrimaryWorkspace, getUserWorkspaceIds } from "@/lib/session";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const workspaceIds = await getUserWorkspaceIds(session.user.id);
  const projects = await prisma.project.findMany({
    where: { workspaceId: { in: workspaceIds } },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ projects });
}

const createSchema = z.object({
  title: z.string().min(2),
  type: z.enum(["IMAGE", "VIDEO", "CAPTION", "SCRIPT", "CAMPAIGN"]),
  data: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid project." }, { status: 400 });
  }

  const workspace = await getPrimaryWorkspace(session.user.id);
  if (!workspace) {
    return NextResponse.json({ error: "No workspace." }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      userId: session.user.id,
      title: parsed.data.title,
      type: parsed.data.type,
      data: JSON.stringify(parsed.data.data || {}),
    },
  });

  return NextResponse.json({ project });
}

const patchSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  status: z.string().optional(),
  data: z.unknown().optional(),
  thumbnail: z.string().optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  const project = await prisma.project.update({
    where: { id: parsed.data.id },
    data: {
      title: parsed.data.title,
      status: parsed.data.status,
      thumbnail: parsed.data.thumbnail,
      data:
        parsed.data.data !== undefined
          ? JSON.stringify(parsed.data.data)
          : undefined,
    },
  });

  return NextResponse.json({ project });
}
