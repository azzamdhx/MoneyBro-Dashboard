"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils/currency";
import { formatMonthYear } from "@/lib/utils/format";
import { GET_INCOMES } from "@/lib/graphql/queries";
import { Plus, Wallet, CalendarDays, RefreshCw, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Income {
  id: string;
  sourceName: string;
  amount: number;
  incomeType: string;
  incomeDate: string | null;
  isRecurring: boolean;
  notes: string | null;
  category: {
    id: string;
    name: string;
  };
}

interface IncomesData {
  incomes: {
    items: Income[];
    summary: {
      total: number;
      count: number;
    };
  };
}

interface MonthlySummary {
  month: string;
  monthKey: string;
  total: number;
  itemCount: number;
  categories: string[];
}

const getMonthName = (dateStr: string): string => {
  return formatMonthYear(dateStr);
};

const getMonthKey = (dateStr: string): string => {
  return dateStr.slice(0, 7);
};

export default function IncomesPage() {
  const router = useRouter();
  const { data, loading } = useQuery<IncomesData>(GET_INCOMES);
  const [fabOpen, setFabOpen] = useState(false);

  const incomes: Income[] = data?.incomes.items || [];
  const totalAll = incomes.reduce((sum, i) => sum + i.amount, 0);

  const monthlySummaries: MonthlySummary[] = Object.values(
    incomes.reduce((acc, income) => {
      const dateStr = income.incomeDate || new Date().toISOString();
      const monthKey = getMonthKey(dateStr);

      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: getMonthName(dateStr),
          monthKey,
          total: 0,
          itemCount: 0,
          categories: [],
        };
      }

      acc[monthKey].total += income.amount;
      acc[monthKey].itemCount += 1;

      if (!acc[monthKey].categories.includes(income.category.name)) {
        acc[monthKey].categories.push(income.category.name);
      }

      return acc;
    }, {} as Record<string, MonthlySummary>)
  ).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pemasukan</h1>
          <p className="text-muted-foreground hidden sm:block">Kelola pemasukan bulanan kamu</p>
        </div>
        <div className="hidden md:flex md:flex-row gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/recurring-incomes">
              <RefreshCw className="h-4 w-4 mr-2" />
              Pemasukkan Tetap
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/incomes/new">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Pemasukan
            </Link>
          </Button>
        </div>
      </div>

      <Card className="bg-card border-1">
        <CardHeader>
          <CardTitle className="flex flex-col items-start gap-4">
            <span className="text-primary">Total Pemasukkan</span>
            <span className="text-2xl text-income">{formatIDR(totalAll)}</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
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
      ) : monthlySummaries.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {monthlySummaries.map((summary) => (
            <Card
              key={summary.monthKey}
              className="cursor-pointer hover:border-accent transition-colors py-0"
              onClick={() => router.push(`/incomes/month/${summary.monthKey}`)}
            >
              <CardContent className="p-4">
                <div className="flex mb-2">
                  <div className="h-8 w-8 rounded-lg bg-income/10 flex items-center justify-center">
                    <CalendarDays className="h-4 w-4 text-income" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold">{summary.month}</h3>
                  <p className="text-lg font-bold text-income">{formatIDR(summary.total)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <Wallet className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">Belum ada data pemasukan</p>
            <p className="text-xs mt-1">Klik tombol Tambah Pemasukan untuk mencatat pemasukan</p>
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
              href="/incomes/new"
              onClick={() => setFabOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-muted-foreground hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Pemasukan</span>
            </Link>
            <Link
              href="/recurring-incomes"
              onClick={() => setFabOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-muted-foreground hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Pemasukkan Tetap</span>
            </Link>
          </div>
        </PopoverContent>
      </Popover>
    </div>
    </>
  );
}
