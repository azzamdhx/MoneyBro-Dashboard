"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils/currency";
import { formatMonthYear } from "@/lib/utils/format";
import { GET_EXPENSES } from "@/lib/graphql/queries";
import { DELETE_EXPENSE } from "@/lib/graphql/mutations";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EditableExpenseTable } from "@/components/expense/editable-expense-table";

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

const getMonthName = (monthKey: string): string => {
  return formatMonthYear(`${monthKey}-01`);
};

export default function MonthDetailPage() {
  const router = useRouter();
  const params = useParams();
  const monthKey = params.monthKey as string;

  const { data, loading, refetch } = useQuery<ExpensesData>(GET_EXPENSES);

  const [deleteExpense, { loading: deleting }] = useMutation(DELETE_EXPENSE);

  const allExpenses: Expense[] = data?.expenses.items || [];
  
  // Filter expenses for this month
  const expenses = allExpenses.filter((expense) => {
    if (!expense.expenseDate) return false;
    return expense.expenseDate.slice(0, 7) === monthKey;
  });

  const total = expenses.reduce((sum, e) => sum + e.total, 0);

  // Group by category for summary
  const categoryTotals = expenses.reduce((acc, expense) => {
    const catName = expense.category.name;
    if (!acc[catName]) {
      acc[catName] = 0;
    }
    acc[catName] += expense.total;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{getMonthName(monthKey)}</h1>
            <p className="text-muted-foreground">Detail pengeluaran bulan ini</p>
          </div>
        </div>
        {expenses.length > 0 && (
          <DeleteConfirmDialog
            title="Hapus Semua Data Bulan Ini"
            description={`Apakah kamu yakin ingin menghapus ${expenses.length} pengeluaran di bulan ${getMonthName(monthKey)}? Tindakan ini tidak dapat dibatalkan.`}
            onConfirm={async () => {
              try {
                await Promise.all(
                  expenses.map(expense => deleteExpense({ variables: { id: expense.id } }))
                );
                toast.success(`${expenses.length} pengeluaran berhasil dihapus`);
                router.push("/expenses");
              } catch {
                toast.error("Gagal menghapus pengeluaran");
              }
            }}
            loading={deleting}
            trigger={
              <Button variant="destructive" disabled={deleting}>
                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Hapus Bulan Ini
              </Button>
            }
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col gap-4 items-start">
              <span className="text-primary">Total Bulan Ini</span>
              <span className="text-2xl text-expense">{formatIDR(total)}</span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per Kategori</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {Object.entries(categoryTotals).map(([category, catTotal]) => (
                <div key={category} className="flex items-center justify-between text-sm">
                  <span className="text-primary">{category}</span>
                  <span className="font-bold">{formatIDR(catTotal)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Item ({expenses.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : expenses.length > 0 ? (
            <EditableExpenseTable
              expenses={expenses}
              monthKey={monthKey}
              onRefetch={refetch}
            />
          ) : (
            <EditableExpenseTable
              expenses={[]}
              monthKey={monthKey}
              onRefetch={refetch}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
