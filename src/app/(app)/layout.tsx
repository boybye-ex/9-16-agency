import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/app/sidebar";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col bg-[#02060e] text-[#fafafa] md:flex-row">
      <AppSidebar name={session.user.name} role={session.user.role} />
      <main className="flex-1 overflow-auto">
        <div className="atmosphere min-h-full">
          <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
