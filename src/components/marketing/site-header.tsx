import Link from "next/link";
import { auth } from "@/lib/auth";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="absolute inset-x-0 top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" className="font-display text-xl font-extrabold tracking-tight text-[#fafafa]">
          9:16 <span className="text-[#00bbff]">Adds</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-[#a8b3c2] md:flex">
          <a href="#features" className="hover:text-white">
            Features
          </a>
          <a href="#who" className="hover:text-white">
            Who it&apos;s for
          </a>
          <Link href="/pricing" className="hover:text-white">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {session?.user ? (
            <Link
              href="/dashboard"
              className="btn-primary rounded-full px-4 py-2 text-sm font-semibold"
            >
              Open app
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-[#a8b3c2] hover:text-white">
                Sign in
              </Link>
              <Link
                href="/register"
                className="btn-primary rounded-full px-4 py-2 text-sm font-semibold"
              >
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
