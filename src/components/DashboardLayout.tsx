import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Activity, Calendar, LogOut, LayoutDashboard, Moon, Sun, Users, User, FileText, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="rounded-full"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
};

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut } = useAuth();
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = useState(false);

  useEffect(() => {
    const loadRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserRole(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setUserRole(data?.role ?? null);
    };
    loadRole();
  }, []);

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    // Show Patients link only for non-patient roles. When userRole is null/unknown, hide it to avoid flicker.
    ...((userRole === "doctor" || userRole === "healthcare_organization")
      ? [{ to: "/patients", icon: Users, label: "Patients" }] as const
      : []),
    // Show patient-only links only when role is explicitly patient
    ...(userRole === "patient"
      ? [
          { to: "/patient/profile", icon: User, label: "Patient Profile" },
          { to: "/patient/medical-history", icon: FileText, label: "Medical History" },
        ]
      : []),
    { to: "/appointments", icon: Calendar, label: "Appointments" },
  ];

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Mobile Top Bar */}
      {isMobile && (
        <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b bg-card/90 backdrop-blur-sm px-3">
          <Button type="button" variant="ghost" size="icon" onClick={() => setOpenMobile(true)} aria-label="Open menu">
            <PanelLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold truncate">MedicareX</span>
          </div>
          <ThemeToggle />
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`hidden md:block ${collapsed ? "w-20" : "w-64"} border-r bg-card/90 backdrop-blur-sm transition-all duration-200 h-svh overflow-y-auto overflow-x-hidden sticky top-0`}> 
        <div className="hidden md:flex h-16 items-center justify-between gap-2 border-b px-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Activity className="h-6 w-6 text-primary-foreground" />
            </div>
            {!collapsed && <span className="text-lg font-semibold truncate">MedicareX</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed((v) => !v)}
              aria-label="Toggle sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
        
        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            
            return (
              <Link key={item.to} to={item.to}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    isActive && "bg-secondary font-medium"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {!collapsed && item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className={`absolute bottom-0 ${collapsed ? "w-20" : "w-64"} border-t p-2 overflow-x-hidden`}>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && "Sign Out"}
          </Button>
        </div>
      </aside>

      {/* Mobile Sheet Sidebar */}
      {isMobile && (
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent side="left" className="w-64 p-0 h-full overflow-y-auto">
            <div className="flex h-14 items-center gap-2 border-b px-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-base font-semibold">MedicareX</span>
            </div>
            <nav className="space-y-1 p-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <Link key={item.to} to={item.to} onClick={() => setOpenMobile(false)}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn("w-full justify-start gap-3", isActive && "bg-secondary font-medium")}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t p-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => { setOpenMobile(false); signOut(); }}
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className={`container mx-auto ${isMobile ? "pt-16 px-4" : "py-8 px-6"}`}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
