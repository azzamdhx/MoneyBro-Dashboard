"use client";

import { useState, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  Wallet,
  TrendingUp,
  Bell,
  LogOut,
  PanelRightOpen,
  PanelRightClose,
  History,
  LineChart,
  RefreshCw,
  FileText,
  ChevronDown,
  PiggyBank,
} from "lucide-react";
import { useQuery } from "@apollo/client/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Cookies from "js-cookie";
import Image from "next/image";
import { GET_ME } from "@/lib/graphql/queries";

interface NavChild {
  title: string;
  href: string;
  icon: React.ElementType;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "History",
    href: "/history",
    icon: History,
  },
  {
    title: "Forecast",
    href: "/forecast",
    icon: LineChart,
  },
  {
    title: "Notifikasi",
    href: "/notifications",
    icon: Bell,
  },
  {
    title: "Pemasukan",
    href: "/incomes",
    icon: TrendingUp,
    children: [
      {
        title: "Income Tetap",
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
    title: "Hutang",
    href: "/debts",
    icon: Wallet,
  },
  {
    title: "Cicilan",
    href: "/installments",
    icon: CreditCard,
  },
  {
    title: "Tabungan",
    href: "/savings",
    icon: PiggyBank,
  },
];

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => { },
});

export const useSidebar = () => useContext(SidebarContext);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

interface UserData {
  me: {
    profileImage: string;
  };
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, setCollapsed } = useSidebar();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { data } = useQuery<UserData>(GET_ME);
  const profileImage = data?.me?.profileImage || "BRO-1-B";

  const toggleExpand = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(h => h !== href)
        : [...prev, href]
    );
  };

  const isItemActive = (item: NavItem) => {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
    if (item.children) {
      return item.children.some(child => 
        pathname === child.href || pathname.startsWith(`${child.href}/`)
      );
    }
    return false;
  };

  const handleLogout = () => {
    Cookies.remove("token");
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "hidden md:flex md:flex-col md:fixed md:inset-y-0 bg-card border-r border-border transition-all duration-300",
        collapsed ? "md:w-[72px]" : "md:w-64"
      )}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className={cn("flex items-center h-16", collapsed ? "px-3 justify-center" : "px-6")}>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/primary-logo.png"
              alt="MoneyBro"
              width={32}
              height={32}
              className="flex-shrink-0"
            />
            {!collapsed && <span className="text-xl font-bold text-primary">MoneyBro</span>}
          </Link>
        </div>

        <Separator />

        <Button
          className={cn(
            "bg-transparent text-accent items-center rounded-lg w-max m-3 mb-0 hover:bg-accent hover:text-primary",
            collapsed ? "justify-center !px-3 !py-2" : "justify-start !px-3 !py-2"
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <PanelRightClose className="!h-5.5 !w-5.5"/>
          ) : (
            <>
              <PanelRightOpen className="!h-5.5 !w-5.5"/>

            </>
          )}
        </Button>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = isItemActive(item);
            const isExpanded = expandedItems.includes(item.href) || isActive;
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.href}>
                {hasChildren ? (
                  <>
                    <div className="flex items-center">
                      <Link
                        href={item.href}
                        title={collapsed ? item.title : undefined}
                        className={cn(
                          "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          collapsed && "justify-center px-0",
                          isActive
                            ? "bg-secondary text-primary"
                            : "text-muted-foreground hover:bg-secondary hover:text-primary"
                        )}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && item.title}
                      </Link>
                      {!collapsed && (
                        <button
                          onClick={() => toggleExpand(item.href)}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ChevronDown 
                            className={cn(
                              "h-4 w-4 transition-transform duration-200",
                              isExpanded && "rotate-180"
                            )} 
                          />
                        </button>
                      )}
                    </div>
                    {!collapsed && isExpanded && item.children && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
                        {item.children.map((child) => {
                          const isChildActive = pathname === child.href || pathname.startsWith(`${child.href}/`);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                                isChildActive
                                  ? "bg-secondary/50 text-primary"
                                  : "text-muted-foreground hover:bg-secondary/50 hover:text-primary"
                              )}
                            >
                              <child.icon className="h-4 w-4 flex-shrink-0" />
                              {child.title}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    title={collapsed ? item.title : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      collapsed && "justify-center px-0",
                      isActive
                        ? "bg-secondary text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-primary"
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && item.title}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        <div className="px-3 py-4 space-y-1">
          <Separator className="mb-4" />
          <Link
            href="/settings"
            title={collapsed ? "Settings" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              collapsed && "justify-center px-0",
              pathname === "/settings" || pathname === "/profile"
                ? "bg-secondary text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-primary"
            )}
          >
            <Image
              src={`/profile-pics/${profileImage}.webp`}
              alt="Profile"
              width={20}
              height={20}
              unoptimized
              className={cn(
                "h-5 w-5 rounded-full object-cover flex-shrink-0 ring-1",
                pathname === "/settings" || pathname === "/profile"
                  ? "ring-primary"
                  : "ring-muted-foreground/30"
              )}
            />
            {!collapsed && "Settings"}
          </Link>
          <Button
            title={collapsed ? "Logout" : undefined}
            className={cn(
              "w-full gap-3 px-3 py-2.5 text-destructive bg-transparent hover:bg-destructive hover:text-primary",
              collapsed ? "justify-center px-0" : "justify-start"
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && "Logout"}
          </Button>
        </div>
      </div>
    </aside>
  );
}
