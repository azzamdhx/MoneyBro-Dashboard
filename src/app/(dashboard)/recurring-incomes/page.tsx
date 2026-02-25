"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/utils/currency";
import { GET_RECURRING_INCOME_GROUPS } from "@/lib/graphql/queries";
import { Plus, RefreshCw, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RecurringIncomeGroup {
  id: string;
  name: string;
  recurringDay: number | null;
  isActive: boolean;
  notes: string | null;
  total: number;
  createdAt: string;
  items: {
    id: string;
    sourceName: string;
    amount: number;
    category: {
      id: string;
      name: string;
    };
  }[];
}

interface RecurringIncomeGroupsData {
  recurringIncomeGroups: RecurringIncomeGroup[];
}

export default function RecurringIncomesPage() {
  const router = useRouter();
  const { data, loading } = useQuery<RecurringIncomeGroupsData>(GET_RECURRING_INCOME_GROUPS);

  const groups = data?.recurringIncomeGroups || [];
  const totalMonthly = groups
    .filter(g => g.isActive)
    .reduce((sum, g) => sum + g.total, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-20" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Pemasukkan Tetap</h1>
            <p className="text-muted-foreground text-sm hidden sm:block">Kelola pemasukan tetap bulanan</p>
          </div>
        </div>
        <Button asChild size="sm" className="hidden md:inline-flex">
          <Link href="/recurring-incomes/new">
            <Plus className="h-4 w-4 mr-2" />
            Pemasukkan Tetap
          </Link>
        </Button>
      </div>

      <Card className="bg-card border-1 py-4 md:py-6">
        <CardHeader className="flex flex-col px-4">
          <CardTitle className="flex flex-col items-start md:gap-4 gap-3 w-full">
            <span className="text-primary text-sm md:text-lg">Total Bulanan</span>
            <span className="text-md sm:text-2xl text-income">{formatIDR(totalMonthly)}</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {groups.length > 0 ? (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
          {groups.map((group) => (
            <Card
              key={group.id}
              className="cursor-pointer hover:border-accent transition-colors py-0"
              onClick={() => router.push(`/recurring-incomes/${group.id}`)}
            >
              <CardContent className="p-4 md:px-6 md:py-0 flex flex-col gap-3">
                <div className="hidden md:flex items-center justify-between mb-2">
                  <div className="h-8 w-8 rounded-lg bg-income/10 flex items-center justify-center">
                    <RefreshCw className="h-4 w-4 text-income" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={group.isActive ? "default" : "secondary"} className="text-xs">
                      {group.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-3 md:gap-2">
                  <h3 className="text-sm md:text-lg font-semibold">{group.name}</h3>
                  <p className="text-md font-semibold text-income">{formatIDR(group.total)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">{group.items.length} item</Badge>
                  {group.recurringDay && (
                    <Badge variant="outline" className="text-xs">Tgl {group.recurringDay}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <RefreshCw className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">Belum ada income tetap</p>
          </CardContent>
        </Card>
      )}
    </div>

    {/* Floating Action Button - Mobile Only */}
    <div className="fixed bottom-10 right-6 z-[60] md:hidden">
      <Link
        href="/recurring-incomes/new"
        className="flex items-center justify-center w-14 h-14 rounded-full shadow-lg bg-primary text-primary-foreground"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
    </>
  );
}
