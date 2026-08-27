"use client";

import { FormEvent, useEffect, useState } from "react";

interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  _count: { projects: number; socialAccounts: number };
  members: { role: string; user: { name: string | null; email: string } }[];
}

export default function ClientsPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/clients");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Agency access only");
      setLoading(false);
      return;
    }
    setWorkspaces(data.workspaces || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInfo("");
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        companyName: form.get("companyName"),
        password: form.get("password") || "client123",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not invite");
      return;
    }
    setInfo(
      `Client ready: ${data.client.email} (temp password: ${data.client.temporaryPassword})`,
    );
    e.currentTarget.reset();
    await load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Clients</h1>
      <p className="mt-2 text-[#a8b3c2]">
        Agency teams can create client workspaces and invite brand logins.
      </p>

      <form onSubmit={onInvite} className="panel mt-8 grid gap-3 rounded-2xl p-5 md:grid-cols-2">
        <input name="name" className="input" placeholder="Client contact name" required />
        <input name="email" type="email" className="input" placeholder="Client email" required />
        <input name="companyName" className="input" placeholder="Brand / company" required />
        <input
          name="password"
          className="input"
          placeholder="Temp password (optional)"
          minLength={6}
        />
        <button
          type="submit"
          className="btn-primary rounded-xl px-5 py-3 text-sm font-semibold md:col-span-2"
        >
          Invite client
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-[#c50337]">{error}</p> : null}
      {info ? <p className="mt-3 text-sm text-[#00bbff]">{info}</p> : null}

      <div className="mt-10 space-y-4">
        {loading ? (
          <p className="text-sm text-[#a8b3c2]">Loading…</p>
        ) : (
          workspaces.map((ws) => (
            <div key={ws.id} className="panel rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold">{ws.name}</h2>
                  <p className="text-xs text-[#a8b3c2]">/{ws.slug}</p>
                </div>
                <p className="text-sm text-[#a8b3c2]">
                  {ws._count.projects} projects · {ws._count.socialAccounts} social
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {ws.members.map((m) => (
                  <span
                    key={`${ws.id}-${m.user.email}`}
                    className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[#a8b3c2]"
                  >
                    {m.user.name || m.user.email} · {m.role}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
