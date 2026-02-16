"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import Cookies from "js-cookie";
import { GET_ME } from "@/lib/graphql/queries";
import {
  User,
  Bell,
  Mail,
  Tags,
  ChevronRight,
  LogOut
} from "lucide-react";
import { formatDateID } from "@/lib/utils/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface UserData {
  me: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
  };
}

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
  disabled?: boolean;
  href?: string;
}

function SettingItem({ icon, title, description, trailing, disabled, href }: SettingItemProps) {
  const content = (
    <div className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${disabled ? 'opacity-50' : 'hover:bg-muted/50 cursor-pointer'}`}>
      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{title}</p>
        {description && <p className="text-sm text-muted-foreground hidden sm:block">{description}</p>}
      </div>
      <div className="flex-shrink-0">
        {trailing || <ChevronRight className="h-5 w-5 text-muted-foreground" />}
      </div>
    </div>
  );

  if (href && !disabled) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2">{title}</h2>
      <div className="rounded-xl border bg-card divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { data, loading } = useQuery<UserData>(GET_ME);

  const user = data?.me;

  const handleLogout = () => {
    Cookies.remove("token");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Profile Skeleton */}
          <div className="space-y-1">
            <Skeleton className="h-3 w-16 ml-4 mb-2" />
            <div className="rounded-xl border bg-card p-6">
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2 flex flex-col items-center">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Right Column - Preferensi + Bantuan Skeleton */}
          <div className="space-y-4">
            <div className="space-y-1">
              <Skeleton className="h-3 w-20 ml-4 mb-2" />
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-16 ml-4 mb-2" />
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        <p className="text-muted-foreground hidden sm:block">Kelola akun dan preferensi kamu</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Profile */}
        <div className="space-y-4">
          <SettingSection title="Profil">
            <Link href="/profile" className="flex flex-col items-center gap-3 p-6 transition-colors hover:bg-muted/50">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold">{user?.name || "User"}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                {user?.createdAt && (
                  <p className="text-xs text-muted-foreground">Bergabung sejak {formatDateID(user.createdAt)}</p>
                )}
              </div>
            </Link>
          </SettingSection>
        </div>

        {/* Right Column - Preferensi + Bantuan */}
        <div className="space-y-4">
          <SettingSection title="Preferensi">
            <SettingItem
              icon={<Tags className="h-5 w-5" />}
              title="Kelola Kategori"
              description="Atur kategori pemasukan & pengeluaran"
              href="/settings/categories"
            />
            <SettingItem
              icon={<Bell className="h-5 w-5" />}
              title="Notifikasi"
              description="Pengingat cicilan & jatuh tempo"
              href="/settings/notifications"
            />
          </SettingSection>

          <SettingSection title="Bantuan">
            <SettingItem
              icon={<Mail className="h-5 w-5" />}
              title="Hubungi Kami"
              description="Kirim pertanyaan atau masukan"
              href="/contact"
            />
          </SettingSection>
        </div>
      </div>
      {/* Logout Button - Mobile Only */}
      <div className="md:hidden">
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
