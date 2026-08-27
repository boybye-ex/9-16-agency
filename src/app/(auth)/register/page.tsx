"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
      companyName: String(form.get("companyName")),
      role: String(form.get("role") || "CLIENT"),
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Could not register.");
      return;
    }

    const login = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });
    setLoading(false);
    if (login?.error) {
      router.push("/login");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="atmosphere flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display text-2xl font-bold text-white">
          9:16 <span className="text-[#00bbff]">Adds</span>
        </Link>
        <h1 className="mt-6 font-display text-3xl font-bold">Create your account</h1>
        <p className="mt-2 text-sm text-[#a8b3c2]">
          Join as a client brand or agency teammate.
        </p>
        <form onSubmit={onSubmit} className="panel mt-8 space-y-4 rounded-2xl p-6">
          <div>
            <label className="mb-2 block text-sm text-[#a8b3c2]">Full name</label>
            <input name="name" required className="input" placeholder="Your name" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-[#a8b3c2]">Company / brand</label>
            <input name="companyName" required className="input" placeholder="Brand name" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-[#a8b3c2]">Email</label>
            <input name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-[#a8b3c2]">Password</label>
            <input name="password" type="password" minLength={6} required className="input" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-[#a8b3c2]">I am…</label>
            <select name="role" className="input" defaultValue="CLIENT">
              <option value="CLIENT">A client brand</option>
              <option value="AGENCY_MEMBER">Agency team</option>
            </select>
          </div>
          {error ? <p className="text-sm text-[#c50337]">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-sm text-[#a8b3c2]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#00bbff] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
