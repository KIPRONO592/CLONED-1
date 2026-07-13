import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getSiteByHost, type SitePublic } from "@/lib/site.functions";

const SiteContext = createContext<SitePublic | null>(null);

export function useSite(): SitePublic {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used inside <SiteProvider>");
  return ctx;
}

const FALLBACK: SitePublic = {
  id: "00000000-0000-0000-0000-000000000000",
  slug: "waafi",
  site_name: "Waafi Loans",
  domains: [],
  logo_url: "/waafi-logo.png",
  bg_url: null,
  theme: {
    primary: "oklch(0.48 0.14 150)",
    secondary: "oklch(0.94 0.05 150)",
    accent: "oklch(0.72 0.16 145)",
    background: "oklch(0.99 0.008 150)",
    foreground: "oklch(0.20 0.04 155)",
  },
  content: {
    tagline: "Instant loans paid directly to your Waafi mobile wallet.",
    walletName: "Waafi",
    banner:
      "Funds are disbursed straight to your Waafi mobile wallet as soon as your application is approved.",
    phonePrefix: "+252",
  },
  features: { calculator: true, otpFlow: true },
  active: true,
  is_default: true,
};

export function SiteProvider({ children }: { children: ReactNode }) {
  const [site, setSite] = useState<SitePublic>(FALLBACK);
  const fetchSite = useServerFn(getSiteByHost);

  useEffect(() => {
    const host =
      typeof window !== "undefined" ? window.location.hostname : "";
    if (!host) return;
    fetchSite({ data: { host } })
      .then((s) => s && setSite(s))
      .catch(() => {});
  }, [fetchSite]);

  return (
    <SiteContext.Provider value={site}>
      <ThemeStyle site={site} />
      {children}
    </SiteContext.Provider>
  );
}

function ThemeStyle({ site }: { site: SitePublic }) {
  const t = site.theme || {};
  const entries: [string, string | undefined][] = [
    ["--primary", t.primary],
    ["--secondary", t.secondary],
    ["--accent", t.accent],
    ["--background", t.background],
    ["--foreground", t.foreground],
    ["--ring", t.primary],
  ];
  const css = `:root{${entries
    .filter(([, v]) => !!v)
    .map(([k, v]) => `${k}:${v};`)
    .join("")}}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}