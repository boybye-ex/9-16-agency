import { auth } from "@/lib/auth";
import { roleLabel } from "@/lib/roles";

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <p className="mt-2 text-[#a8b3c2]">Your account and workspace basics.</p>
      <div className="panel mt-8 max-w-lg space-y-4 rounded-2xl p-6">
        <div>
          <p className="text-xs uppercase text-[#a8b3c2]">Name</p>
          <p className="mt-1">{session?.user?.name}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-[#a8b3c2]">Email</p>
          <p className="mt-1">{session?.user?.email}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-[#a8b3c2]">Role</p>
          <p className="mt-1">{roleLabel(session?.user?.role)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-[#a8b3c2]">Company</p>
          <p className="mt-1">{session?.user?.companyName || "—"}</p>
        </div>
        <div className="border-t border-[var(--line)] pt-4 text-sm text-[#a8b3c2]">
          Add <code className="text-[#00bbff]">OPENAI_API_KEY</code> or{" "}
          <code className="text-[#00bbff]">GROQ_API_KEY</code> for live LLM writing.
          Image generation works out of the box. Add Meta / TikTok app keys for live
          OAuth social pulls.
        </div>
      </div>
    </div>
  );
}
