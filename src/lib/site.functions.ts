import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SitePublic = {
  id: string;
  slug: string;
  site_name: string;
  domains: string[];
  logo_url: string | null;
  bg_url: string | null;
  theme: Record<string, string>;
  content: Record<string, string>;
  features: Record<string, boolean>;
  active: boolean;
  is_default: boolean;
};

const FALLBACK_SITE: SitePublic = {
  id: "00000000-0000-0000-0000-000000000000",
  slug: "waafi",
  site_name: "Waafi Loans",
  domains: [],
  logo_url: "/waafi-logo.png",
  bg_url: null,
  theme: {
    primary: "oklch(0.58 0.18 145)",
    secondary: "oklch(0.9 0.15 130)",
    accent: "oklch(0.85 0.18 135)",
    background: "oklch(0.98 0.02 140)",
    foreground: "oklch(0.22 0.06 150)",
  },
  content: {
    tagline: "Instant loans paid directly to your Waafi mobile wallet.",
    walletName: "Waafi",
    banner:
      "Funds are disbursed straight to your Waafi mobile wallet as soon as your application is approved — Approval takes less than 5 mins for successful application.",
    phonePrefix: "+252",
  },
  features: { calculator: true, otpFlow: true },
  active: true,
  is_default: true,
};

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/:\d+$/, "");
}

async function loadSiteByHost(host: string): Promise<SitePublic> {
  try {
    const { getSupabaseAdmin } = await import("./supabase-admin.server");
    const supabase = getSupabaseAdmin();
    const h = normalizeHost(host);

    const { data: matches } = await supabase
      .from("sites_public")
      .select("*")
      .contains("domains", [h]);
    if (matches && matches.length > 0) return matches[0] as SitePublic;

    const { data: def } = await supabase
      .from("sites_public")
      .select("*")
      .eq("is_default", true)
      .maybeSingle();
    if (def) return def as SitePublic;

    return FALLBACK_SITE;
  } catch {
    return FALLBACK_SITE;
  }
}

export const getSiteByHost = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ host: z.string() }).parse(input))
  .handler(async ({ data }) => loadSiteByHost(data.host));

// ---------------------------- Admin (password gated) ----------------------------

function checkAdmin(token: string | undefined): void {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error("ADMIN_PASSWORD is not configured on the server");
  if (!token || token !== expected) throw new Error("Unauthorized");
}

const adminLoginSchema = z.object({ password: z.string() });

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((input) => adminLoginSchema.parse(input))
  .handler(async ({ data }) => {
    checkAdmin(data.password);
    return { ok: true };
  });

const sitePayloadSchema = z.object({
  slug: z.string().trim().min(1).max(60).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, hyphens"),
  site_name: z.string().trim().min(1).max(120),
  domains: z.array(z.string().trim().toLowerCase()).default([]),
  logo_url: z.string().trim().nullable().optional(),
  bg_url: z.string().trim().nullable().optional(),
  theme: z.record(z.string(), z.string()).default({}),
  content: z.record(z.string(), z.string()).default({}),
  features: z.record(z.string(), z.boolean()).default({}),
  telegram_bot_token: z.string().trim().nullable().optional(),
  telegram_chat_id: z.string().trim().nullable().optional(),
  active: z.boolean().default(true),
  is_default: z.boolean().default(false),
});

export const listSites = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string() }).parse(input))
  .handler(async ({ data }) => {
    checkAdmin(data.token);
    const { getSupabaseAdmin } = await import("./supabase-admin.server");
    const supabase = getSupabaseAdmin();
    const { data: rows, error } = await supabase
      .from("sites")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows;
  });

export const getSite = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ token: z.string(), id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    checkAdmin(data.token);
    const { getSupabaseAdmin } = await import("./supabase-admin.server");
    const supabase = getSupabaseAdmin();
    const { data: row, error } = await supabase
      .from("sites")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createSite = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ token: z.string(), payload: sitePayloadSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    checkAdmin(data.token);
    const { getSupabaseAdmin } = await import("./supabase-admin.server");
    const supabase = getSupabaseAdmin();
    if (data.payload.is_default) {
      await supabase.from("sites").update({ is_default: false }).eq("is_default", true);
    }
    const { data: row, error } = await supabase
      .from("sites")
      .insert(data.payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateSite = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        token: z.string(),
        id: z.string().uuid(),
        payload: sitePayloadSchema.partial(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    checkAdmin(data.token);
    const { getSupabaseAdmin } = await import("./supabase-admin.server");
    const supabase = getSupabaseAdmin();
    if (data.payload.is_default) {
      await supabase
        .from("sites")
        .update({ is_default: false })
        .neq("id", data.id);
    }
    const { data: row, error } = await supabase
      .from("sites")
      .update({ ...data.payload, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSite = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ token: z.string(), id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    checkAdmin(data.token);
    const { getSupabaseAdmin } = await import("./supabase-admin.server");
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("sites").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cloneSite = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ token: z.string(), id: z.string().uuid(), new_slug: z.string() })
      .parse(input),
  )
  .handler(async ({ data }) => {
    checkAdmin(data.token);
    const { getSupabaseAdmin } = await import("./supabase-admin.server");
    const supabase = getSupabaseAdmin();
    const { data: src, error: e1 } = await supabase
      .from("sites")
      .select("*")
      .eq("id", data.id)
      .single();
    if (e1) throw new Error(e1.message);
    const { id: _omit, created_at, updated_at, ...rest } = src as Record<string, unknown>;
    const payload = {
      ...rest,
      slug: data.new_slug,
      site_name: `${(src as { site_name: string }).site_name} (copy)`,
      domains: [],
      is_default: false,
    };
    const { data: row, error } = await supabase
      .from("sites")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listSiteApplications = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ token: z.string(), site_id: z.string().uuid().optional() })
      .parse(input),
  )
  .handler(async ({ data }) => {
    checkAdmin(data.token);
    const { getSupabaseAdmin } = await import("./supabase-admin.server");
    const supabase = getSupabaseAdmin();
    let q = supabase
      .from("loan_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (data.site_id) q = q.eq("site_id", data.site_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows;
  });