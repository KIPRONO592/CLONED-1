import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { adminLogin } from "@/lib/site.functions";
import { getAdminToken, setAdminToken, clearAdminToken } from "@/lib/admin-auth";
import { LayoutDashboard, Plus, LogOut, FileText, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Multi-Site Console" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const [authed, setAuthed] = useState<boolean>(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setAuthed(!!getAdminToken());
    setChecked(true);
  }, []);

  if (!checked) return null;
  if (!authed) return <LoginScreen onAuthed={() => setAuthed(true)} />;
  return <Shell onLogout={() => { clearAdminToken(); setAuthed(false); }} />;
}

function LoginScreen({ onAuthed }: { onAuthed: () => void }) {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useServerFn(adminLogin);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ data: { password: pw } });
      setAdminToken(pw);
      onAuthed();
      toast.success("Welcome");
    } catch (err) {
      toast.error((err as Error).message || "Wrong password");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Toaster richColors position="top-center" />
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>Admin sign-in</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pw">Admin password</Label>
              <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus required />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Checking..." : "Sign in"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Set <code>ADMIN_PASSWORD</code> in your environment to enable access.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Shell({ onLogout }: { onLogout: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const items: { to: string; icon: typeof LayoutDashboard; label: string; exact?: boolean }[] = [
    { to: "/admin", icon: LayoutDashboard, label: "Sites", exact: true },
    { to: "/admin/new", icon: Plus, label: "New site" },
    { to: "/admin/applications", icon: FileText, label: "Applications" },
  ];
  const NavList = ({ onClick }: { onClick?: () => void }) => (
    <nav className="space-y-1 flex-1">
      {items.map((it) => {
        const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
        return (
          <Link
            key={it.to}
            to={it.to as "/admin"}
            onClick={onClick}
            className={
              "flex items-center gap-2 rounded px-3 py-2 text-sm " +
              (active ? "bg-primary text-primary-foreground" : "hover:bg-sidebar-accent")
            }
          >
            <it.icon className="h-4 w-4" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <Toaster richColors position="top-center" />
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between border-b bg-sidebar text-sidebar-foreground px-3 py-2 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Menu"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4 flex flex-col">
              <div className="font-semibold mb-6">Multi-Site Console</div>
              <NavList onClick={() => setOpen(false)} />
              <Button variant="ghost" size="sm" onClick={() => { setOpen(false); onLogout(); navigate({ to: "/admin" }); }}>
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </Button>
            </SheetContent>
          </Sheet>
          <span className="font-semibold text-sm">Console</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => { onLogout(); navigate({ to: "/admin" }); }} aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </header>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 border-r bg-sidebar text-sidebar-foreground p-4 flex-col">
        <div className="font-semibold mb-6">Multi-Site Console</div>
        <NavList />
        <Button variant="ghost" size="sm" onClick={() => { onLogout(); navigate({ to: "/admin" }); }}>
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </aside>
      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}