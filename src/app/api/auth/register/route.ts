import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["CLIENT", "AGENCY_MEMBER"]).default("CLIENT"),
  companyName: z.string().min(2).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check your details." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
    }

    const passwordHash = await hash(parsed.data.password, 10);
    const role = parsed.data.role;
    const companyName =
      parsed.data.companyName ||
      (role === "AGENCY_MEMBER" ? "9:16 Adds" : `${parsed.data.name}'s Brand`);

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash,
        role,
        companyName,
      },
    });

    const baseSlug = slugify(companyName);
    let slug = baseSlug;
    let i = 1;
    while (await prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${i++}`;
    }

    await prisma.workspace.create({
      data: {
        name: companyName,
        slug,
        ownerId: user.id,
        members: {
          create: { userId: user.id, role },
        },
      },
    });

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }
}
