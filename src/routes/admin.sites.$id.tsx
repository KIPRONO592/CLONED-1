import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SiteForm, DEFAULT_PAYLOAD, type SitePayload } from "@/components/admin/SiteForm";
import { getSite, updateSite } from "@/lib/site.functions";
import { getAdminToken } from "@/lib/admin-auth";

export const Route = createFileRoute("/admin/sites/$id")({
  component: EditSite,
});

function EditSite() {
  const { id } = Route.useParams();
  const fetchSite = useServerFn(getSite);
  const update = useServerFn(updateSite);
  const [loading, setLoading] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["site", id],
    queryFn: () => fetchSite({ data: { token: getAdminToken(), id } }),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{(error as Error).message}</p>;
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const initial: SitePayload = {
    ...DEFAULT_PAYLOAD,
    slug: (row.slug as string) ?? "",
    site_name: (row.site_name as string) ?? "",
    domains: (row.domains as string[]) ?? [],
    logo_url: (row.logo_url as string) ?? "",
    bg_url: (row.bg_url as string) ?? "",
    theme: { ...DEFAULT_PAYLOAD.theme, ...((row.theme as Record<string, string>) ?? {}) },
    content: { ...DEFAULT_PAYLOAD.content, ...((row.content as Record<string, string>) ?? {}) },
    features: { ...DEFAULT_PAYLOAD.features, ...((row.features as Record<string, boolean>) ?? {}) },
    telegram_bot_token: (row.telegram_bot_token as string) ?? "",
    telegram_chat_id: (row.telegram_chat_id as string) ?? "",
    active: (row.active as boolean) ?? true,
    is_default: (row.is_default as boolean) ?? false,
  };

  async function onSubmit(payload: SitePayload) {
    setLoading(true);
    try {
      await update({ data: { token: getAdminToken(), id, payload } });
      toast.success("Site updated");
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/admin" className="text-sm text-muted-foreground hover:underline">← Sites</Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">Edit: {initial.site_name}</h1>
      <SiteForm initial={initial} onSubmit={onSubmit} submitLabel="Save changes" loading={loading} />
    </div>
  );
}