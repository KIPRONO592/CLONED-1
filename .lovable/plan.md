# Multi-Site White-Label Platform

Transform the current single-brand loan app into a multi-tenant platform where one codebase powers many branded sites, all managed from a central admin panel.

## Architecture

```
Domain (waafi.vercel.app)
  → resolve site by hostname
  → load SiteConfig from Supabase (cached)
  → inject theme CSS vars + branding into React tree
  → application flow uses site-specific Telegram bot/chat
```

One codebase, one Supabase project, one Vercel deployment with multiple domains attached. Admin lives at `/admin` and is restricted to authenticated admin users.

## Database (new migration)

`sites` table:
- `id` uuid pk, `slug` text unique, `site_name` text
- `domains` text[] (e.g. `['waafi.vercel.app','waafiloan.com']`)
- `logo_url` text, `bg_url` text
- `theme` jsonb — `{ primary, secondary, accent, background, foreground, font }` as HSL strings
- `content` jsonb — `{ tagline, hero, walletName, ctaText, ... }`
- `telegram_bot_token` text, `telegram_chat_id` text (server-only read)
- `features` jsonb — `{ calculator: true, otpFlow: true, ... }`
- `active` boolean, `created_at`, `updated_at`

Add `site_id uuid` FK to `loan_applications` so applications are scoped per site.

`user_roles` table + `app_role` enum + `has_role()` SECURITY DEFINER (per platform rules) for admin gating.

RLS:
- `sites`: anon SELECT only safe columns via a `public.sites_public` view (no tokens). Admins full access.
- `loan_applications`: insert allowed for anon (existing), select/update only for admins.

Logo/bg uploads go to a public `site-assets` Supabase Storage bucket.

## Site Resolution

New `src/lib/site.functions.ts`:
- `getSiteByHost(host)` — server fn, publishable-key client, reads `sites_public` view. Falls back to a `default` site row if no match.
- Returns safe config (no tokens) for the browser.

New `SiteProvider` in `src/routes/__root.tsx`:
- Loader calls `getSiteByHost(window.location.hostname)` (via server fn so SSR works).
- Injects `<style>` tag setting `--primary`, `--secondary`, `--accent`, etc. on `:root` from site theme.
- Provides `useSite()` hook for logo, content, features.

`src/routes/index.tsx` reads from `useSite()` instead of hardcoded "Salaam Bank" / logo.

## Telegram (per-site)

Refactor `src/lib/applications.functions.ts`:
- `submit` accepts `siteId`, looks up bot token + chat id server-side from `sites` (service role), stores `site_id` on the application.
- `sendTelegramDecision` / `resendOtp` load token+chat from the application's `site_id`.

Webhook at `src/routes/api/public/telegram/webhook.ts` already receives all callbacks on one URL. Update it to load the bot token from the application's `site_id` (each site's bot points to the same webhook URL; we identify the site via the application row, not the URL). The existing single webhook stays — no per-site URL needed, which keeps Vercel routing simple.

For brand-new sites, the admin shows the single webhook URL to register with each bot via BotFather/setWebhook.

## Admin Panel (`/admin/*`)

Auth-gated routes (require `admin` role via `has_role`):
- `/admin` — site list as cards with status, domain, app count
- `/admin/sites/new` — create form (name, slug, domains, logo upload, color pickers, telegram token/chat, content fields)
- `/admin/sites/$id` — edit tabs: Branding · Theme · Content · Telegram · Domains · Features · Danger Zone
- `/admin/sites/$id/clone` — duplicates row with new slug
- `/admin/applications` — existing application review list, filterable by site
- `/admin/login` — Supabase email/password sign-in

UI: shadcn sidebar layout, live theme preview panel that renders a mini hero with the chosen colors/logo before saving.

## Backward Compatibility

- Migration seeds the current Salaam Bank config as the `default` site row, claiming `salaambankloan.vercel.app` and `localhost`.
- Existing applications get `site_id = default site id`.
- Existing env vars (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) used as fallback when a site row has empty token fields, so nothing breaks during rollout.
- Existing flow (review → submit → OTP → PIN → OTP → final) unchanged; only branding + token source become dynamic.

## Files Touched (high level)

New:
- migration: `sites`, `user_roles`, `app_role`, `has_role`, view, storage bucket, alter `loan_applications`
- `src/lib/site.functions.ts`, `src/lib/site-context.tsx`
- `src/components/admin/*` (SiteForm, ThemeEditor, LivePreview, SiteCard, AdminShell sidebar)
- `src/routes/_admin/route.tsx` (auth + role gate), `_admin/admin.index.tsx`, `_admin/admin.sites.new.tsx`, `_admin/admin.sites.$id.tsx`, `_admin/admin.applications.tsx`, `auth.tsx`

Edited:
- `src/routes/__root.tsx` — load + apply site
- `src/routes/index.tsx` — consume `useSite()`
- `src/lib/applications.functions.ts` — site-aware Telegram
- `src/routes/api/public/telegram/webhook.ts` — load token from application's site
- `src/styles.css` — theme CSS variables driven by runtime values

## Out of Scope (confirm if you want any)

- Per-site analytics dashboards (placeholder cards only)
- Auto-provisioning Vercel domains via Vercel API (manual add for now; admin just records the domain)
- Per-site separate Telegram webhook URLs (single shared webhook is sufficient and simpler)
