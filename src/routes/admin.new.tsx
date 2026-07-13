import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SiteForm, DEFAULT_PAYLOAD, type SitePayload } from "@/components/admin/SiteForm";
import { createSite } from "@/lib/site.functions";
import { getAdminToken } from "@/lib/admin-auth";

export const Route = createFileRoute("/admin/new")({
  component: NewSite,
});

function NewSite() {
  const create = useServerFn(createSite);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onSubmit(payload: SitePayload) {
    setLoading(true);
    try {
      const row = await create({ data: { token: getAdminToken(), payload } });
      toast.success("Site created");
      navigate({ to: "/admin/sites/$id", params: { id: (row as { id: string }).id } });
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Create new site</h1>
      <SiteForm initial={DEFAULT_PAYLOAD} onSubmit={onSubmit} submitLabel="Create site" loading={loading} />
    </div>
  );
}