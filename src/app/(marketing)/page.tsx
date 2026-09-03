import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <section className="relative min-h-[100svh] overflow-hidden atmosphere">
        <div className="pointer-events-none absolute inset-0 grid-fade" />
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&w=2000&q=80)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            mixBlendMode: "luminosity",
            filter: "saturate(0.7) brightness(0.35)",
          }}
        />
        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-16 pt-28 md:justify-center md:pb-24">
          <p className="animate-rise font-display text-5xl font-extrabold leading-[0.95] tracking-tight text-white md:text-7xl lg:text-8xl">
            9:16 <span className="brand-word">Adds</span>
          </p>
          <h1 className="animate-rise-delay mt-5 max-w-2xl text-xl font-medium text-[#fafafa] md:text-2xl">
            Make scroll-stopping ads. Edit like CapCut. Learn when to post.
          </h1>
          <p className="mt-4 max-w-xl text-[#a8b3c2] animate-rise-delay">
            One web app for your agency team and your clients — AI images, video
            edits, captions, scripts, and social performance advice.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 animate-rise-delay">
            <Link
              href="/register"
              className="btn-primary rounded-full px-6 py-3 text-sm font-semibold"
            >
              Start free
            </Link>
            <Link
              href="/login"
              className="btn-secondary rounded-full px-6 py-3 text-sm font-semibold"
            >
              Sign in
            </Link>
          </div>
          <div className="mt-10 h-px w-40 bg-gradient-to-r from-[#00bbff] to-[#c50337] animate-pulse-line" />
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-5 py-24">
        <h2 className="font-display text-3xl font-bold md:text-4xl">What you can do</h2>
        <p className="mt-3 max-w-2xl text-[#a8b3c2]">
          Built for vertical ads — from first idea to better posting times.
        </p>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {[
            {
              title: "AI images & video edits",
              body: "Generate vertical creatives and cut clips on a CapCut-style timeline with text, trim, and export.",
              accent: "#00bbff",
            },
            {
              title: "Social performance AI",
              body: "Connect Instagram, TikTok, and Facebook. Get best times to post and simple content tutorials.",
              accent: "#c50337",
            },
            {
              title: "Captions & scripts",
              body: "Write captions fast and tighten video scripts so hooks land in the first three seconds.",
              accent: "#fafafa",
            },
          ].map((item) => (
            <div key={item.title} className="border-t border-[var(--line)] pt-6">
              <div className="mb-4 h-1 w-12" style={{ background: item.accent }} />
              <h3 className="font-display text-xl font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#a8b3c2]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="who" className="border-y border-[var(--line)] bg-[#071018]">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold">For agency teams</h2>
            <p className="mt-4 text-[#a8b3c2]">
              Run client workspaces, invite brands, share projects, and keep creative
              + analytics in one place.
            </p>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold">For clients</h2>
            <p className="mt-4 text-[#a8b3c2]">
              Log in, review creatives, generate captions, and see clear posting
              advice without waiting on a long email chain.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="relative overflow-hidden rounded-[2rem] border border-[var(--line)]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1626785774573-4b7993143464?auto=format&fit=crop&w=1600&q=80)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "brightness(0.35)",
            }}
          />
          <div className="relative px-8 py-16 md:px-14">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Ready when your next brief lands.
            </h2>
            <p className="mt-3 max-w-lg text-[#a8b3c2]">
              Jump into the full platform — studio, editor, and analytics — today.
            </p>
            <Link
              href="/register"
              className="btn-primary mt-8 inline-flex rounded-full px-6 py-3 text-sm font-semibold"
            >
              Create your account
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
