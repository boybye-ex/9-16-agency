import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds } from "@/lib/session";

const typeHref: Record<string, string> = {
  IMAGE: "/studio/images",
  VIDEO: "/studio/video",
  CAPTION: "/studio/captions",
  SCRIPT: "/studio/scripts",
};

export default async function ProjectsPage() {
  const session = await auth();
  const workspaceIds = session?.user?.id
    ? await getUserWorkspaceIds(session.user.id)
    : [];

  const projects = await prisma.project.findMany({
    where: { workspaceId: { in: workspaceIds } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Projects</h1>
      <p className="mt-2 text-[#a8b3c2]">Everything your workspace has created.</p>
      <div className="mt-8 space-y-3">
        {projects.length === 0 ? (
          <p className="text-sm text-[#a8b3c2]">No projects yet.</p>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="panel flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4"
            >
              <div>
                <h2 className="font-medium">{project.title}</h2>
                <p className="text-xs text-[#a8b3c2]">
                  {project.type} · {project.status} ·{" "}
                  {project.updatedAt.toLocaleString()}
                </p>
              </div>
              <Link
                href={typeHref[project.type] || "/dashboard"}
                className="text-sm text-[#00bbff] hover:underline"
              >
                Open tool
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
