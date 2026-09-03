"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Wrong email or password.");
      return;
    }
    router.push(params.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="panel mt-8 space-y-4 rounded-2xl p-6">
      <div>
        <label className="mb-2 block text-sm text-[#a8b3c2]">Email</label>
        <input
          name="email"
          type="email"
          required
          defaultValue="agency@916adds.com"
          className="input"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm text-[#a8b3c2]">Password</label>
        <input
          name="password"
          type="password"
          required
          defaultValue="agency123"
          className="input"
        />
      </div>
      {error ? <p className="text-sm text-[#c50337]">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-xs text-[#a8b3c2]">
        Demo: agency@916adds.com / agency123 · client@916adds.com / client123
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="atmosphere flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display text-2xl font-bold text-white">
          9:16 <span className="text-[#00bbff]">Adds</span>
        </Link>
        <h1 className="mt-6 font-display text-3xl font-bold">Welcome back</h1>
        <p className="mt-2 text-sm text-[#a8b3c2]">
          Agency team and clients use the same login.
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-sm text-[#a8b3c2]">
          New here?{" "}
          <Link href="/register" className="text-[#00bbff] hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
