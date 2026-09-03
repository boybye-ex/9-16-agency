import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#02060e] text-[#fafafa]">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
