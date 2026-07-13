import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, Check } from "lucide-react";

export type SitePayload = {
  slug: string;
  site_name: string;
  domains: string[];
  logo_url: string | null;
  bg_url: string | null;
  theme: Record<string, string>;
  content: Record<string, string>;
  features: Record<string, boolean>;
  telegram_bot_token: string | null;
  telegram_chat_id: string | null;
  active: boolean;
  is_default: boolean;
};

export const DEFAULT_PAYLOAD: SitePayload = {
  slug: "",
  site_name: "",
  domains: [],
  logo_url: "",
  bg_url: "",
  theme: {
    primary: "#16a34a",
    secondary: "#bae6fd",
    accent: "#7dd3fc",
    background: "#f8fafc",
    foreground: "#0f172a",
  },
  content: {
    tagline: "",
    walletName: "Waafi",
    banner: "",
    phonePrefix: "+252",
  },
  features: { calculator: true, otpFlow: true },
  telegram_bot_token: "",
  telegram_chat_id: "",
  active: true,
  is_default: false,
};

const COLOR_PRESETS: string[] = [
  "#0f172a", "#1e293b", "#475569", "#f8fafc", "#ffffff",
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#16a34a", "#10b981", "#14b8a6", "#06b6d4",
  "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
  "#d946ef", "#ec4899", "#f43f5e", "#bae6fd", "#fde68a",
];

function toHex(v: string | undefined): string {
  if (!v) return "#000000";
  if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  return "#000000";
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function SiteForm({
  initial,
  onSubmit,
  submitLabel = "Save",
  loading,
}: {
  initial: SitePayload;
  onSubmit: (p: SitePayload) => void;
  submitLabel?: string;
  loading?: boolean;
}) {
  const [p, setP] = useState<SitePayload>(initial);
  const set = <K extends keyof SitePayload>(k: K, v: SitePayload[K]) => setP((prev) => ({ ...prev, [k]: v }));
  const setTheme = (k: string, v: string) => setP((prev) => ({ ...prev, theme: { ...prev.theme, [k]: v } }));
  const setContent = (k: string, v: string) => setP((prev) => ({ ...prev, content: { ...prev.content, [k]: v } }));
  const setFeature = (k: string, v: boolean) => setP((prev) => ({ ...prev, features: { ...prev.features, [k]: v } }));

  async function onLogoFile(e: React.ChangeEvent<HTMLInputElement>, field: "logo_url" | "bg_url") {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) {
      toast.error("Image too large (max 800KB). Please pick a smaller file.");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      set(field, dataUrl);
      toast.success("Image uploaded");
    } catch {
      toast.error("Could not read file");
    }
  }

  const previewStyle = useMemo(
    () => ({
      backgroundColor: p.theme.background,
      color: p.theme.foreground,
    }),
    [p.theme.background, p.theme.foreground],
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(p);
      }}
      className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Basics</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Site name">
              <Input value={p.site_name} onChange={(e) => set("site_name", e.target.value)} required />
            </Field>
            <Field label="Slug (URL-safe)">
              <Input value={p.slug} onChange={(e) => set("slug", e.target.value)} placeholder="rapidcash" required />
            </Field>
            <Field label="Domains (comma-separated hostnames)">
              <Input
                value={p.domains.join(", ")}
                onChange={(e) =>
                  set(
                    "domains",
                    e.target.value
                      .split(",")
                      .map((s) => s.trim().toLowerCase())
                      .filter(Boolean),
                  )
                }
                placeholder="rapidcash.vercel.app, rapidcash.com"
              />
            </Field>
            <Field label="Logo">
              <div className="flex items-center gap-3 flex-wrap">
                {p.logo_url ? (
                  <img src={p.logo_url} alt="" className="h-14 w-14 rounded border object-contain bg-white" />
                ) : (
                  <div className="h-14 w-14 rounded border bg-muted grid place-items-center text-[10px] text-muted-foreground">No logo</div>
                )}
                <label className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm cursor-pointer hover:bg-accent">
                  <Upload className="h-4 w-4" /> Upload from gallery
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onLogoFile(e, "logo_url")} />
                </label>
                {p.logo_url && (
                  <button type="button" className="text-xs underline text-destructive" onClick={() => set("logo_url", "")}>
                    Remove
                  </button>
                )}
              </div>
            </Field>
            <Field label="Background image (optional)">
              <div className="flex items-center gap-3 flex-wrap">
                {p.bg_url ? (
                  <img src={p.bg_url} alt="" className="h-14 w-24 rounded border object-cover" />
                ) : (
                  <div className="h-14 w-24 rounded border bg-muted grid place-items-center text-[10px] text-muted-foreground">None</div>
                )}
                <label className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm cursor-pointer hover:bg-accent">
                  <Upload className="h-4 w-4" /> Upload
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onLogoFile(e, "bg_url")} />
                </label>
                {p.bg_url && (
                  <button type="button" className="text-xs underline text-destructive" onClick={() => set("bg_url", "")}>
                    Remove
                  </button>
                )}
              </div>
            </Field>
            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={p.active} onCheckedChange={(v) => set("active", v)} /> Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={p.is_default} onCheckedChange={(v) => set("is_default", v)} /> Default site
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Theme colors</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {(["primary", "secondary", "accent", "background", "foreground"] as const).map((key) => {
              const val = toHex(p.theme[key]);
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="capitalize">{key}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{val}</span>
                      <input
                        aria-label={`${key} color`}
                        type="color"
                        value={val}
                        onChange={(e) => setTheme(key, e.target.value)}
                        className="h-9 w-12 rounded border cursor-pointer bg-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-10 sm:grid-cols-12 gap-1.5">
                    {COLOR_PRESETS.map((c) => {
                      const active = val.toLowerCase() === c.toLowerCase();
                      return (
                        <button
                          type="button"
                          key={c}
                          onClick={() => setTheme(key, c)}
                          aria-label={c}
                          className={
                            "h-7 w-7 rounded-md border grid place-items-center transition " +
                            (active ? "ring-2 ring-offset-1 ring-primary scale-110" : "hover:scale-110")
                          }
                          style={{ backgroundColor: c }}
                        >
                          {active && <Check className="h-3.5 w-3.5" style={{ color: c === "#ffffff" || c === "#f8fafc" || c === "#fde68a" || c === "#bae6fd" ? "#000" : "#fff" }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground">
              Tap a swatch to pick, or use the color picker for any custom shade.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Content</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Tagline (under the title)">
              <Input value={p.content.tagline ?? ""} onChange={(e) => setContent("tagline", e.target.value)} />
            </Field>
            <Field label="Wallet name">
              <Input value={p.content.walletName ?? ""} onChange={(e) => setContent("walletName", e.target.value)} />
            </Field>
            <Field label="Phone prefix">
              <Input value={p.content.phonePrefix ?? ""} onChange={(e) => setContent("phonePrefix", e.target.value)} />
            </Field>
            <Field label="Top banner copy">
              <Textarea rows={3} value={p.content.banner ?? ""} onChange={(e) => setContent("banner", e.target.value)} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Telegram</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Bot token">
              <Input value={p.telegram_bot_token ?? ""} onChange={(e) => set("telegram_bot_token", e.target.value)} placeholder="123456:ABC..." />
            </Field>
            <Field label="Chat ID">
              <Input value={p.telegram_chat_id ?? ""} onChange={(e) => set("telegram_chat_id", e.target.value)} placeholder="123456789" />
            </Field>
            <p className="text-xs text-muted-foreground">
              Register each bot's webhook to this URL: <code>/api/public/telegram/webhook</code>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Features</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!p.features.calculator} onCheckedChange={(v) => setFeature("calculator", v)} /> Loan calculator
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!p.features.otpFlow} onCheckedChange={(v) => setFeature("otpFlow", v)} /> OTP / PIN flow
            </label>
          </CardContent>
        </Card>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Saving..." : submitLabel}
        </Button>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 self-start min-w-0">
        <Card>
          <CardHeader><CardTitle>Live preview</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border p-4 space-y-3" style={previewStyle}>
              <div className="flex items-center gap-3">
                {p.logo_url && <img src={p.logo_url} alt="" className="h-10 w-auto" />}
                <div>
                  <div className="font-bold" style={{ color: p.theme.primary }}>{p.site_name || "Site name"}</div>
                  <div className="text-xs opacity-80">{p.content.tagline}</div>
                </div>
              </div>
              <div className="text-xs rounded px-3 py-2" style={{ background: p.theme.accent, color: p.theme.foreground }}>
                {p.content.banner || "Banner copy preview"}
              </div>
              <button
                type="button"
                className="rounded px-3 py-2 text-sm font-medium"
                style={{ background: p.theme.primary, color: "#fff" }}
              >
                Apply now
              </button>
            </div>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}