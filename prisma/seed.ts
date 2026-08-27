import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { seedMetricsForAccount } from "../src/lib/social";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: "agency@916adds.com" },
  });
  if (existing) {
    console.log("Demo users already exist — skipping seed.");
    return;
  }

  const agencyPassword = await hash("agency123", 10);
  const memberPassword = await hash("member123", 10);
  const clientPassword = await hash("client123", 10);

  const agency = await prisma.user.create({
    data: {
      name: "Aisha Ndlovu",
      email: "agency@916adds.com",
      passwordHash: agencyPassword,
      role: "AGENCY_ADMIN",
      companyName: "9:16 Adds",
    },
  });

  const member = await prisma.user.create({
    data: {
      name: "Leo Mokoena",
      email: "team@916adds.com",
      passwordHash: memberPassword,
      role: "AGENCY_MEMBER",
      companyName: "9:16 Adds",
    },
  });

  const client = await prisma.user.create({
    data: {
      name: "Jordan Peters",
      email: "client@916adds.com",
      passwordHash: clientPassword,
      role: "CLIENT",
      companyName: "Northwind Retail",
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: "Northwind Retail",
      slug: "northwind-retail",
      ownerId: agency.id,
      members: {
        create: [
          { userId: agency.id, role: "AGENCY_ADMIN" },
          { userId: member.id, role: "AGENCY_MEMBER" },
          { userId: client.id, role: "CLIENT" },
        ],
      },
    },
  });

  await prisma.workspace.create({
    data: {
      name: "9:16 Internal",
      slug: "916-internal",
      ownerId: agency.id,
      members: {
        create: [
          { userId: agency.id, role: "AGENCY_ADMIN" },
          { userId: member.id, role: "AGENCY_MEMBER" },
        ],
      },
    },
  });

  await prisma.project.createMany({
    data: [
      {
        workspaceId: workspace.id,
        userId: agency.id,
        title: "Summer drop — image set",
        type: "IMAGE",
        status: "ready",
        data: JSON.stringify({ prompts: ["vertical fashion ad, neon rim light"] }),
      },
      {
        workspaceId: workspace.id,
        userId: member.id,
        title: "Hook cut — 15s",
        type: "VIDEO",
        status: "editing",
        data: JSON.stringify({ duration: 15 }),
      },
      {
        workspaceId: workspace.id,
        userId: client.id,
        title: "Caption pack — launch week",
        type: "CAPTION",
        status: "draft",
        data: JSON.stringify({ platform: "tiktok" }),
      },
    ],
  });

  const ig = await prisma.socialAccount.create({
    data: {
      workspaceId: workspace.id,
      userId: agency.id,
      platform: "INSTAGRAM",
      accountName: "@northwind.sa",
      connected: true,
    },
  });
  const tt = await prisma.socialAccount.create({
    data: {
      workspaceId: workspace.id,
      userId: agency.id,
      platform: "TIKTOK",
      accountName: "@northwind_tiktok",
      connected: true,
    },
  });
  const fb = await prisma.socialAccount.create({
    data: {
      workspaceId: workspace.id,
      userId: agency.id,
      platform: "FACEBOOK",
      accountName: "Northwind Retail",
      connected: true,
    },
  });

  await seedMetricsForAccount(ig.id, "INSTAGRAM");
  await seedMetricsForAccount(tt.id, "TIKTOK");
  await seedMetricsForAccount(fb.id, "FACEBOOK");

  console.log("Seeded users:");
  console.log("  agency@916adds.com / agency123");
  console.log("  team@916adds.com / member123");
  console.log("  client@916adds.com / client123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
