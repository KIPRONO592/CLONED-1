import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listSites, deleteSite, cloneSite } from "@/lib/site.functions";
import { getAdminToken } from "@/lib/admin-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  component: SitesList,
});

function SitesList() {
  const list = useServerFn(listSites);
  const del = useServerFn(deleteSite);
  const clone = useServerFn(cloneSite);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["sites"],
    queryFn: () => list({ data: { token: getAdminToken() } }),
  });

  async function onDelete(id: string, name: string) {
    if (!confirm(`Delete site "${name}"? This cannot be undone.`)) return;
    try {
      await del({ data: { token: getAdminToken(), id } });
      toast.success("Site deleted");
      qc.invalidateQueries({ queryKey: ["sites"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  async function onClone(id: string) {
    const slug = prompt("New slug for the cloned site:");
    if (!slug) return;
    try {
      await clone({ data: { token: getAdminToken(), id, new_slug: slug } });
      toast.success("Cloned");
      qc.invalidateQueries({ queryKey: ["sites"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Sites</h1>
        <Link to="/admin/new" className="rounded bg-primary text-primary-foreground px-3 py-2 text-sm">+ New site</Link>
      </div>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">{(error as Error).message}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(data ?? []).map((s: any) => (
          <Card key={s.id}>
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                {s.logo_url && <img src={s.logo_url} alt="" className="h-12 w-12 object-contain" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{s.site_name}</span>
                    <code className="text-xs text-muted-foreground">{s.slug}</code>
                    {s.is_default && <Badge variant="secondary">default</Badge>}
                    {!s.active && <Badge variant="destructive">inactive</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 break-words">
                    {(s.domains ?? []).join(", ") || "no domains"}
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <Link to="/admin/sites/$id" params={{ id: s.id }} className="text-xs underline">Edit</Link>
                    <button onClick={() => onClone(s.id)} className="text-xs underline">Clone</button>
                    <button onClick={() => onDelete(s.id, s.site_name)} className="text-xs text-destructive underline">Delete</button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {data?.length === 0 && <p className="text-muted-foreground">No sites yet. Create one to get started.</p>}
      </div>
    </div>
  );
}