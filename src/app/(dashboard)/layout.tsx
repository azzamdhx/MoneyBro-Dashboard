"use client";

import { Sidebar, SidebarProvider, useSidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { cn } from "@/lib/utils";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main
        className={cn(
          "transition-all duration-300",
          collapsed ? "md:pl-[72px]" : "md:pl-64"
        )}
      >
        <div className="p-4 md:p-8 pb-20 md:pb-8">{children}</div>
      </main>
      <MobileNav />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
