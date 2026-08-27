import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAgency } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds } from "@/lib/session";
import { z } from "zod";
import { hash } from "bcryptjs";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  if (!isAgency(session.user.role)) {
    return NextResponse.json({ error: "Agency only." }, { status: 403 });
  }

  const workspaceIds = await getUserWorkspaceIds(session.user.id);
  const workspaces = await prisma.workspace.findMany({
    where: { id: { in: workspaceIds } },
    include: {
      members: { include: { user: true } },
      _count: { select: { projects: true, socialAccounts: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ workspaces });
}

const inviteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  companyName: z.string().min(2),
  password: z.string().min(6).default("client123"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  if (!isAgency(session.user.role)) {
    return NextResponse.json({ error: "Agency only." }, { status: 403 });
  }

  const parsed = inviteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Check client details." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        role: "CLIENT",
        companyName: parsed.data.companyName,
        passwordHash: await hash(parsed.data.password, 10),
      },
    });
  }

  let slug = slugify(parsed.data.companyName);
  let i = 1;
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    slug = `${slugify(parsed.data.companyName)}-${i++}`;
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: parsed.data.companyName,
      slug,
      ownerId: session.user.id,
      members: {
        create: [
          { userId: session.user.id, role: session.user.role },
          { userId: user.id, role: "CLIENT" },
        ],
      },
    },
  });

  return NextResponse.json({
    workspace,
    client: { email: user.email, temporaryPassword: parsed.data.password },
  });
}
