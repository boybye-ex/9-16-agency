import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)] bg-[#02060e]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-lg text-white">
            9:16 <span className="text-[#00bbff]">Adds</span>
          </p>
          <p className="mt-1 text-sm text-[#a8b3c2]">
            Vertical creative, AI editing, and social performance in one place.
          </p>
        </div>
        <div className="flex gap-5 text-sm text-[#a8b3c2]">
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
          <Link href="/pricing" className="hover:text-white">
            Pricing
          </Link>
          <Link href="/login" className="hover:text-white">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
