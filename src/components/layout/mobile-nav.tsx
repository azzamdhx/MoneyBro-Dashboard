"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { cn } from "@/lib/utils";
import { GET_ME } from "@/lib/graphql/queries";
import {
  House,
  TrendingUp,
  Receipt,
  CreditCard,
  Wallet,
  History,
  Bell,
  CalendarClock,
  RefreshCw,
  FileText,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface NavChild {
  title: string;
  href: string;
  icon: React.ElementType;
}

interface MenuItem {
  title: string;
  href: string;
  icon: React.ElementType;
  children?: NavChild[];
}

const menuItems: MenuItem[] = [
  {
    title: "Pemasukan",
    href: "/incomes",
    icon: TrendingUp,
    children: [
      {
        title: "Tetap",
        href: "/recurring-incomes",
        icon: RefreshCw,
      },
    ],
  },
  {
    title: "Pengeluaran",
    href: "/expenses",
    icon: Receipt,
    children: [
      {
        title: "Template",
        href: "/expense-templates",
        icon: FileText,
      },
    ],
  },
  {
    title: "Cicilan",
    href: "/installments",
    icon: CreditCard,
  },
  {
    title: "Hutang",
    href: "/debts",
    icon: Wallet,
  },
  {
    title: "Forecast",
    href: "/forecast",
    icon: CalendarClock,
  },
];

const allowedRoutes = [
  "/dashboard",
  "/incomes",
  "/recurring-incomes",
  "/expenses",
  "/expense-templates",
  "/installments",
  "/debts",
  "/settings",
  "/history",
  "/forecast",
  "/notifications",
];

interface UserData {
  me: {
    profileImage: string;
  };
}

export function MobileNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { data } = useQuery<UserData>(GET_ME);
  const profileImage = data?.me?.profileImage || "BRO-1-B";

  // Check if current path is in allowed routes (exact match only)
  const shouldShowNav = allowedRoutes.includes(pathname);

  if (!shouldShowNav) {
    return null;
  }

  return (
    <nav className="md:hidden pb-5 fixed bottom-0 left-0 right-0 z-50">
      {/* Background with rounded top */}
      <div className="absolute inset-0 bg-card rounded-t-3xl border-t border-x border-border" />
      
      <div className="relative flex items-center justify-around h-16">
        {/* Home/Dashboard */}
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center justify-center px-3 py-2 transition-colors",
            pathname === "/dashboard" || pathname.startsWith("/dashboard/")
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <House className={cn("h-6 w-6", (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) && "fill-current")} />
        </Link>

        {/* History */}
        <Link
          href="/history"
          className={cn(
            "flex items-center justify-center px-3 py-2 transition-colors",
            pathname === "/history" || pathname.startsWith("/history/")
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <History className="h-6 w-6" />
        </Link>

        {/* Menu Popover - Floating FAB */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "relative -mt-8 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200",
                isOpen 
                  ? "bg-destructive text-primary scale-95" 
                  : "bg-accent text-primary"
              )}
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Wallet className="h-6 w-6" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-52 p-2 mb-4 border-border/50 shadow-2xl backdrop-blur-xl bg-gradient-to-b from-card/95 to-background/95" 
            align="center" 
            side="top"
          >
            <div className="grid gap-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const hasChildren = item.children && item.children.length > 0;
                const isChildActive = hasChildren && item.children?.some(
                  child => pathname === child.href || pathname.startsWith(`${child.href}/`)
                );

                return (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                        isActive || isChildActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                    {hasChildren && item.children && (
                      <div className="ml-4 border-l border-border/50 pl-2 mt-1 space-y-1">
                        {item.children.map((child) => {
                          const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                                childActive
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:bg-muted"
                              )}
                            >
                              <child.icon className="h-3 w-3" />
                              <span>{child.title}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Notifikasi */}
        <Link
          href="/notifications"
          className={cn(
            "flex items-center justify-center px-3 py-2 transition-colors",
            pathname === "/notifications" || pathname.startsWith("/notifications/")
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <Bell className={cn("h-6 w-6", (pathname === "/notifications" || pathname.startsWith("/notifications/")) && "fill-current")} />
        </Link>

        {/* Profil */}
        <Link
          href="/settings"
          className={cn(
            "flex items-center justify-center px-3 py-2 transition-colors",
            pathname === "/settings" || pathname.startsWith("/settings/") || pathname === "/profile" || pathname.startsWith("/profile/")
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <Image
            src={`/profile-pics/${profileImage}.webp`}
            alt="Profile"
            width={20}
            height={20}
            unoptimized
            className={cn(
              "h-6 w-6 rounded-full object-cover ring-1",
              pathname === "/settings" || pathname.startsWith("/settings/") || pathname === "/profile" || pathname.startsWith("/profile/")
                ? "ring-primary ring-2"
                : "ring-muted-foreground/30"
            )}
          />
        </Link>
      </div>
    </nav>
  );
}
