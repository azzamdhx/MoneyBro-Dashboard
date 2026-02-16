"use client";

import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
import { toast } from "sonner";
import { Bell, Calendar, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GET_ME } from "@/lib/graphql/queries";

const UPDATE_NOTIFICATION_SETTINGS = gql`
  mutation UpdateNotificationSettings($input: UpdateNotificationSettingsInput!) {
    updateNotificationSettings(input: $input) {
      id
      notifyInstallment
      notifyDebt
      notifyDaysBefore
    }
  }
`;

interface UserData {
  me: {
    id: string;
    notifyInstallment: boolean;
    notifyDebt: boolean;
    notifyDaysBefore: number;
  };
}

export default function NotificationSettingsPage() {
  const { data, loading, refetch } = useQuery<UserData>(GET_ME);
  const [updateSettings, { loading: updating }] = useMutation(UPDATE_NOTIFICATION_SETTINGS);

  const user = data?.me;

  const handleToggleInstallment = async (checked: boolean) => {
    try {
      await updateSettings({
        variables: {
          input: { notifyInstallment: checked },
        },
      });
      refetch();
      toast.success("Pengaturan notifikasi diperbarui");
    } catch {
      toast.error("Gagal memperbarui pengaturan");
    }
  };

  const handleToggleDebt = async (checked: boolean) => {
    try {
      await updateSettings({
        variables: {
          input: { notifyDebt: checked },
        },
      });
      refetch();
      toast.success("Pengaturan notifikasi diperbarui");
    } catch {
      toast.error("Gagal memperbarui pengaturan");
    }
  };

  const handleDaysChange = async (value: string) => {
    try {
      await updateSettings({
        variables: {
          input: { notifyDaysBefore: parseInt(value) },
        },
      });
      refetch();
      toast.success("Pengaturan notifikasi diperbarui");
    } catch {
      toast.error("Gagal memperbarui pengaturan");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            ))}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-[140px]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-4 w-80 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Pengaturan Notifikasi</h1>
          <p className="text-muted-foreground hidden sm:block">Kelola pengingat email untuk cicilan dan hutang</p>
        </div>
      </div>

      <Card>
        <CardContent className="px-6">
          <p className="text-sm text-muted-foreground text-center">
            Email akan dikirim ke alamat email akun kamu pada pukul 08:00 WIB
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Email Pengingat
          </CardTitle>
          <CardDescription className="hidden sm:block">
            Kami akan mengirim email pengingat sebelum tanggal jatuh tempo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notify-installment" className="text-base font-medium">
                Pengingat Cicilan
              </Label>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Terima email sebelum cicilan jatuh tempo
              </p>
            </div>
            <Switch
              id="notify-installment"
              checked={user?.notifyInstallment ?? true}
              onCheckedChange={handleToggleInstallment}
              disabled={updating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notify-debt" className="text-base font-medium">
                Pengingat Hutang/Piutang
              </Label>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Terima email sebelum hutang/piutang jatuh tempo
              </p>
            </div>
            <Switch
              id="notify-debt"
              checked={user?.notifyDebt ?? true}
              onCheckedChange={handleToggleDebt}
              disabled={updating}
            />
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Waktu Pengingat
                </Label>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Berapa hari sebelum jatuh tempo ingin diingatkan
                </p>
              </div>
              <Select
                value={String(user?.notifyDaysBefore ?? 3)}
                onValueChange={handleDaysChange}
                disabled={updating}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hari</SelectItem>
                  <SelectItem value="2">2 hari</SelectItem>
                  <SelectItem value="3">3 hari</SelectItem>
                  <SelectItem value="5">5 hari</SelectItem>
                  <SelectItem value="7">7 hari</SelectItem>
                  <SelectItem value="14">14 hari</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
