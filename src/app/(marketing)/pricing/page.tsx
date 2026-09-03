import Link from "next/link";

const tiers = [
  {
    name: "Studio",
    price: "R2,500",
    blurb: "For growing brands starting with AI creative.",
    features: ["AI images & captions", "Video editor", "1 workspace", "Email support"],
  },
  {
    name: "Agency",
    price: "R7,500",
    blurb: "For teams running multiple clients.",
    features: [
      "Everything in Studio",
      "Client workspaces",
      "Social analytics AI",
      "Script coach",
      "Priority support",
    ],
    featured: true,
  },
  {
    name: "Scale",
    price: "Custom",
    blurb: "For high-volume vertical ad programs.",
    features: ["Unlimited seats", "Live social OAuth", "Custom workflows", "SLA"],
  },
];

export default function PricingPage() {
  return (
    <div className="atmosphere px-5 pb-24 pt-28">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-display text-4xl font-bold md:text-5xl">Pricing</h1>
        <p className="mt-3 max-w-xl text-[#a8b3c2]">
          Simple plans for agencies and the brands they serve.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-3xl border p-6 ${
                tier.featured
                  ? "border-[#c50337]/50 bg-[rgba(197,3,55,0.08)]"
                  : "border-[var(--line)] bg-[#071018]/80"
              }`}
            >
              <h2 className="font-display text-2xl font-bold">{tier.name}</h2>
              <p className="mt-2 text-3xl font-semibold text-[#00bbff]">{tier.price}</p>
              <p className="mt-2 text-sm text-[#a8b3c2]">{tier.blurb}</p>
              <ul className="mt-6 space-y-2 text-sm text-[#fafafa]">
                {tier.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`mt-8 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold ${
                  tier.featured ? "btn-primary" : "btn-secondary"
                }`}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
