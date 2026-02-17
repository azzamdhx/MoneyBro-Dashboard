"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils/currency";
import { formatMonthYear, toRFC3339 } from "@/lib/utils/format";
import { GET_INCOMES } from "@/lib/graphql/queries";
import { CREATE_INCOME, UPDATE_INCOME, DELETE_INCOME } from "@/lib/graphql/mutations";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EditableIncomeTable } from "@/components/income/editable-income-table";

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

export default function MonthlyIncomesPage() {
  const router = useRouter();
  const params = useParams();
  const monthKey = params.monthKey as string;

  const { data, loading, refetch } = useQuery<IncomesData>(GET_INCOMES);

  const [createIncome] = useMutation(CREATE_INCOME);
  const [updateIncome] = useMutation(UPDATE_INCOME);
  const [deleteIncome, { loading: deleting }] = useMutation(DELETE_INCOME);

  const allIncomes: Income[] = data?.incomes.items || [];
  const incomes = allIncomes.filter((income) => {
    const incomeMonth = income.incomeDate?.slice(0, 7);
    return incomeMonth === monthKey;
  });

  const total = incomes.reduce((sum, i) => sum + i.amount, 0);

  const monthLabel = formatMonthYear(`${monthKey}-01`);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{monthLabel}</h1>
          </div>
        </div>
        {incomes.length > 0 && (
          <DeleteConfirmDialog
            title="Hapus Semua Data Bulan Ini"
            description={`Apakah kamu yakin ingin menghapus ${incomes.length} pemasukan di bulan ${monthLabel}? Tindakan ini tidak dapat dibatalkan.`}
            onConfirm={async () => {
              try {
                await Promise.all(
                  incomes.map(income => deleteIncome({ variables: { id: income.id } }))
                );
                toast.success(`${incomes.length} pemasukan berhasil dihapus`);
                router.push("/incomes");
              } catch {
                toast.error("Gagal menghapus pemasukan");
              }
            }}
            loading={deleting}
            trigger={
              <Button variant="destructive" size="sm" className="w-fit self-end">
                <Trash2 className="h-4 w-4 mr-2" />
                Hapus
              </Button>
            }
          />
        )}
      </div>

      <Card className="bg-card border-1">
        <CardHeader>
          <CardTitle className="flex flex-col gap-4 items-start">
            <span className="text-primary">Pemasukan</span>
            <span className="text-2xl text-income">{formatIDR(total)}</span>
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pemasukan ({incomes.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-6">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : (
            <EditableIncomeTable
              items={incomes}
              onCreateItem={async (input) => {
                await createIncome({ variables: { input: { ...input, incomeDate: toRFC3339(monthKey) } } });
                refetch();
              }}
              onUpdateItem={async (id, input) => {
                await updateIncome({ variables: { id, input } });
              }}
              onDeleteItem={async (id) => {
                await deleteIncome({ variables: { id } });
              }}
              onSaveComplete={() => refetch()}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
