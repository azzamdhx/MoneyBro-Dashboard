"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils/currency";
import { formatMonthYear } from "@/lib/utils/format";
import { GET_EXPENSES } from "@/lib/graphql/queries";
import { Plus, Receipt, CalendarDays, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Expense {
  id: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  total: number;
  notes: string | null;
  expenseDate: string | null;
  category: {
    id: string;
    name: string;
  };
}

interface ExpensesData {
  expenses: {
    items: Expense[];
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
  return dateStr.slice(0, 7); // YYYY-MM
};

export default function ExpensesPage() {
  const router = useRouter();
  const { data, loading } = useQuery<ExpensesData>(GET_EXPENSES);

  const expenses: Expense[] = data?.expenses.items || [];
  const totalAll = expenses.reduce((sum, e) => sum + e.total, 0);

  // Group expenses by month
  const monthlySummaries: MonthlySummary[] = Object.values(
    expenses.reduce((acc, expense) => {
      const dateStr = expense.expenseDate || new Date().toISOString();
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
      
      acc[monthKey].total += expense.total;
      acc[monthKey].itemCount += 1;
      
      if (!acc[monthKey].categories.includes(expense.category.name)) {
        acc[monthKey].categories.push(expense.category.name);
      }
      
      return acc;
    }, {} as Record<string, MonthlySummary>)
  ).sort((a, b) => b.monthKey.localeCompare(a.monthKey)); // Sort by newest first

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pengeluaran</h1>
          <p className="text-muted-foreground">Perencanaan pengeluaran bulanan</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
          <Button asChild variant="outline" size="sm" className="w-full sm:w-fit">
            <Link href="/expense-templates">
              <FileText className="h-4 w-4 sm:mr-2" />
              <span>Template</span>
            </Link>
          </Button>
          <Button asChild size="sm" className="w-full sm:w-fit">
            <Link href="/expenses/new">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Rencana Baru</span>
              <span className="sm:hidden">Tambah</span>
            </Link>
          </Button>
        </div>
      </div>

      <Card className="bg-card border-1">
        <CardHeader>
          <CardTitle className="flex flex-col gap-4 items-start">
            <span className="text-primary">Total Semua Pengeluaran</span>
            <span className="text-2xl text-expense">{formatIDR(totalAll)}</span>
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
              onClick={() => router.push(`/expenses/month/${summary.monthKey}`)}
            >
              <CardContent className="p-4">
                <div className="flex mb-2">
                  <div className="h-8 w-8 rounded-lg bg-expense/10 flex items-center justify-center">
                    <CalendarDays className="h-4 w-4 text-expense" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold">{summary.month}</h3>
                  <p className="text-lg font-bold text-expense">{formatIDR(summary.total)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <Receipt className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">Belum ada perencanaan pengeluaran</p>
            <p className="text-xs mt-1">Klik tombol Rencana Baru untuk membuat perencanaan</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
