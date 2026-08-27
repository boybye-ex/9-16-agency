import Link from "next/link";
import { auth } from "@/lib/auth";
import { isAgency, roleLabel } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds } from "@/lib/session";

export default async function DashboardPage() {
  const session = await auth();
  const workspaceIds = session?.user?.id
    ? await getUserWorkspaceIds(session.user.id)
    : [];

  const [projectCount, socialCount, recentProjects] = await Promise.all([
    prisma.project.count({ where: { workspaceId: { in: workspaceIds } } }),
    prisma.socialAccount.count({ where: { workspaceId: { in: workspaceIds } } }),
    prisma.project.findMany({
      where: { workspaceId: { in: workspaceIds } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  const tools = [
    {
      href: "/studio/images",
      title: "AI Images",
      desc: "Generate vertical creatives from a prompt.",
    },
    {
      href: "/studio/video",
      title: "Video Editor",
      desc: "Trim, stack clips, add text, export.",
    },
    {
      href: "/studio/captions",
      title: "Captions",
      desc: "Write social captions in seconds.",
    },
    {
      href: "/analytics",
      title: "Analytics AI",
      desc: "Best times + content tutorials.",
    },
  ];

  return (
    <div>
      <p className="text-sm text-[#00bbff]">{roleLabel(session?.user?.role)}</p>
      <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">
        Hey {session?.user?.name?.split(" ")[0] || "there"}
      </h1>
      <p className="mt-2 text-[#a8b3c2]">
        {isAgency(session?.user?.role)
          ? "Run client work and creative from one hub."
          : "Review creatives, make content, and see posting tips."}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Projects", value: projectCount },
          { label: "Social accounts", value: socialCount },
          {
            label: "Workspace",
            value: session?.user?.companyName || "—",
          },
        ].map((stat) => (
          <div key={stat.label} className="panel rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wide text-[#a8b3c2]">{stat.label}</p>
            <p className="mt-2 font-display text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-display text-xl font-semibold">Jump in</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="panel group rounded-2xl p-5 transition hover:border-[#00bbff]/40"
          >
            <h3 className="font-display text-lg font-semibold group-hover:text-[#00bbff]">
              {tool.title}
            </h3>
            <p className="mt-2 text-sm text-[#a8b3c2]">{tool.desc}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-12 font-display text-xl font-semibold">Recent projects</h2>
      <div className="mt-4 space-y-3">
        {recentProjects.length === 0 ? (
          <p className="text-sm text-[#a8b3c2]">No projects yet — open the studio to start.</p>
        ) : (
          recentProjects.map((p) => (
            <div
              key={p.id}
              className="panel flex items-center justify-between rounded-xl px-4 py-3"
            >
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-[#a8b3c2]">
                  {p.type} · {p.status}
                </p>
              </div>
              <Link href="/projects" className="text-sm text-[#00bbff]">
                View
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
