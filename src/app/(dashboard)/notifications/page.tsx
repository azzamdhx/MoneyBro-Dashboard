"use client";

import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
import { Bell, Mail, CreditCard, Wallet, Inbox } from "lucide-react";
import { formatDateShortID } from "@/lib/utils/format";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const GET_NOTIFICATIONS = gql`
  query GetNotifications {
    notifications {
      id
      type
      referenceId
      sentAt
      emailSubject
      createdAt
    }
  }
`;

interface Notification {
  id: string;
  type: string;
  referenceId: string;
  sentAt: string;
  emailSubject: string | null;
  createdAt: string;
}

interface NotificationsData {
  notifications: Notification[];
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return "Hari ini";
  } else if (days === 1) {
    return "Kemarin";
  } else if (days < 7) {
    return `${days} hari lalu`;
  } else {
    return formatDateShortID(date);
  }
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "INSTALLMENT_REMINDER":
      return <CreditCard className="h-5 w-5 text-installment" />;
    case "DEBT_REMINDER":
      return <Wallet className="h-5 w-5 text-debt" />;
    default:
      return <Mail className="h-5 w-5 text-muted-foreground" />;
  }
}

function getNotificationLabel(type: string) {
  switch (type) {
    case "INSTALLMENT_REMINDER":
      return "Cicilan";
    case "DEBT_REMINDER":
      return "Hutang";
    default:
      return "Notifikasi";
  }
}

export default function NotificationsPage() {
  const { data, loading } = useQuery<NotificationsData>(GET_NOTIFICATIONS);

  const notifications = data?.notifications || [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 py-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifikasi</h1>
          <p className="text-muted-foreground hidden sm:block">Riwayat email pengingat yang telah dikirim</p>
        </div>
        <Button variant="outline" asChild className="w-fit">
          <Link href="/settings/notifications">
            <Bell className="h-4 w-4 mr-2" />
            Pengaturan
          </Link>
        </Button>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Belum ada notifikasi</h3>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
              Email pengingat akan muncul di sini setelah dikirim. Pastikan pengaturan notifikasi sudah aktif.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/settings/notifications">Atur Notifikasi</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card key={notification.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">
                      {notification.emailSubject || "Pengingat"}
                    </p>
                    <Badge variant="secondary" className="flex-shrink-0">
                      {getNotificationLabel(notification.type)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Dikirim {formatDate(notification.sentAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
