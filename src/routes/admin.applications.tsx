import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listSiteApplications, listSites } from "@/lib/site.functions";
import { getAdminToken } from "@/lib/admin-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export const Route = createFileRoute("/admin/applications")({
  component: AppsList,
});

function AppsList() {
  const listApps = useServerFn(listSiteApplications);
  const listAll = useServerFn(listSites);
  const [siteId, setSiteId] = useState<string>("");

  const { data: sites } = useQuery({
    queryKey: ["sites"],
    queryFn: () => listAll({ data: { token: getAdminToken() } }),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["applications", siteId],
    queryFn: () =>
      listApps({ data: { token: getAdminToken(), site_id: siteId || undefined } }),
    refetchInterval: 5000,
  });

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Applications</h1>
        <select
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          className="rounded border bg-background px-3 py-2 text-sm w-full sm:w-auto"
        >
          <option value="">All sites</option>
          {(sites ?? []).map((s: any) => (
            <option key={s.id} value={s.id}>{s.site_name}</option>
          ))}
        </select>
      </div>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">{(error as Error).message}</p>}
      <div className="space-y-3">
        {(data ?? []).map((row: any) => (
          <Card key={row.id}>
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{row.full_name}</span>
                    <Badge variant="secondary">{row.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground break-words">{row.email} · {row.phone}</p>
                  <p className="text-sm">Amount <b>${row.amount}</b> · {row.months}mo @ {row.interest_rate}%</p>
                  <p className="text-sm text-muted-foreground break-words">{row.purpose}</p>
                </div>
                <div className="text-xs text-muted-foreground sm:whitespace-nowrap">
                  {new Date(row.created_at).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {data?.length === 0 && <p className="text-muted-foreground">No applications.</p>}
      </div>
    </div>
  );
}