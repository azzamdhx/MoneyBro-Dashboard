"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { cn } from "@/lib/utils";
import { GET_ME, GET_EXPENSES } from "@/lib/graphql/queries";
import { House, Wallet, Plus, Bell } from "@phosphor-icons/react";

interface Expense {
  id: string;
  expenseDate: string | null;
}

interface ExpensesData {
  expenses: {
    items: Expense[];
  };
}

const allowedRoutes = [
  "/dashboard",
  "/pockets",
  "/notifications",
  "/settings",  
];

interface UserData {
  me: {
    profileImage: string;
  };
}

export function MobileNav() {
  const pathname = usePathname();
  const { data } = useQuery<UserData>(GET_ME);
  const { data: expensesData } = useQuery<ExpensesData>(GET_EXPENSES);
  const profileImage = data?.me?.profileImage || "BRO-1-B";

  const expenseHref = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const items = expensesData?.expenses?.items || [];
    const hasCurrentMonth = items.some(
      (e) => e.expenseDate && e.expenseDate.slice(0, 7) === currentMonth
    );
    return hasCurrentMonth ? `/expenses/month/${currentMonth}` : "/expenses/new";
  }, [expensesData]);

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
          <House size={24} weight={pathname === "/dashboard" || pathname.startsWith("/dashboard/") ? "fill" : "regular"} />
        </Link>

        {/* Pockets */}
        <Link
          href="/pockets"
          className={cn(
            "flex items-center justify-center px-3 py-2 transition-colors",
            pathname === "/pockets" || pathname.startsWith("/pockets/")
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <Wallet size={24} weight={pathname === "/pockets" || pathname.startsWith("/pockets/") ? "fill" : "regular"} />
        </Link>

        {/* Expenses - FAB */}
        <Link
          href={expenseHref}
          className={cn(
            "relative -mt-8 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200",
            pathname === "/expenses" || pathname.startsWith("/expenses/")
              ? "bg-primary text-primary-foreground"
              : "bg-accent text-primary"
          )}
        >
          <Plus className="h-6 w-6" weight="bold" />
        </Link>

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
          <Bell size={24} weight={pathname === "/notifications" || pathname.startsWith("/notifications/") ? "fill" : "regular"} />
        </Link>

        {/* Profil/Settings */}
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
