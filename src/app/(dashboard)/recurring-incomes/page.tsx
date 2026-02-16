"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/utils/currency";
import { GET_RECURRING_INCOMES } from "@/lib/graphql/queries";
import { Plus, RefreshCw, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface RecurringIncome {
  id: string;
  sourceName: string;
  amount: number;
  incomeType: string;
  recurringDay: number;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  category: {
    id: string;
    name: string;
  };
}

interface RecurringIncomesData {
  recurringIncomes: RecurringIncome[];
}

const INCOME_TYPE_LABELS: Record<string, string> = {
  SALARY: "Gaji",
  FREELANCE: "Freelance",
  BUSINESS: "Bisnis",
  INVESTMENT: "Investasi",
  BONUS: "Bonus",
  REFUND: "Refund",
  GIFT: "Hadiah",
  OTHER: "Lainnya",
};

export default function RecurringIncomesPage() {
  const router = useRouter();
  const { data, loading } = useQuery<RecurringIncomesData>(GET_RECURRING_INCOMES);
  const [fabOpen, setFabOpen] = useState(false);

  const recurringIncomes = data?.recurringIncomes || [];
  const totalMonthly = recurringIncomes
    .filter(r => r.isActive)
    .reduce((sum, r) => sum + r.amount, 0);

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="h-10 w-10 rounded-lg bg-income/10 flex items-center justify-center shrink-0">
            <RefreshCw className="h-5 w-5 text-income" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Pemasukkan Tetap</h1>
            <p className="text-muted-foreground text-sm hidden sm:block">Kelola pemasukan tetap bulanan</p>
          </div>
        </div>
        <Button asChild size="sm" className="hidden md:inline-flex">
          <Link href="/recurring-incomes/new">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Pemasukkan Tetap
          </Link>
        </Button>
      </div>

      <Card className="bg-card border-1">
        <CardHeader>
          <CardTitle className="flex flex-col items-start gap-4">
            <span className="text-primary">Total Bulanan</span>
            <span className="text-2xl text-income">{formatIDR(totalMonthly)}</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {recurringIncomes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recurringIncomes.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:border-accent transition-colors py-0"
              onClick={() => router.push(`/recurring-incomes/${item.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="h-8 w-8 rounded-lg bg-income/10 flex items-center justify-center">
                    <RefreshCw className="h-4 w-4 text-income" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={item.isActive ? "default" : "secondary"} className="text-xs">
                      {item.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold">{item.sourceName}</h3>
                  <p className="text-lg font-bold text-income">{formatIDR(item.amount)}</p>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge variant="outline" className="text-xs">{item.category.name}</Badge>
                  <Badge variant="outline" className="text-xs">{INCOME_TYPE_LABELS[item.incomeType] || item.incomeType}</Badge>
                  <Badge variant="outline" className="text-xs">Tgl {item.recurringDay}</Badge>
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
            <p className="text-xs mt-1">Klik tombol Tambah untuk membuat income tetap baru</p>
          </CardContent>
        </Card>
      )}
    </div>

    {/* Floating Action Button - Mobile Only */}
    <div className="fixed bottom-28 right-6 z-[60] md:hidden">
      <Popover open={fabOpen} onOpenChange={setFabOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200",
              fabOpen
                ? "bg-destructive text-destructive-foreground scale-95"
                : "bg-primary text-primary-foreground"
            )}
          >
            {fabOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Plus className="h-6 w-6" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-52 p-2 mb-2 border-border/50 shadow-2xl backdrop-blur-xl bg-gradient-to-b from-card/95 to-background/95"
          align="end"
          side="top"
        >
          <div className="grid gap-1">
            <Link
              href="/recurring-incomes/new"
              onClick={() => setFabOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-muted-foreground hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah</span>
            </Link>
          </div>
        </PopoverContent>
      </Popover>
    </div>
    </>
  );
}
