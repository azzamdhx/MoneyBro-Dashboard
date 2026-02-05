"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/utils/currency";
import { GET_RECURRING_INCOMES } from "@/lib/graphql/queries";
import { DELETE_RECURRING_INCOME } from "@/lib/graphql/mutations";
import { Plus, RefreshCw, Calendar, Trash2, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const { data, loading, refetch } = useQuery<RecurringIncomesData>(GET_RECURRING_INCOMES);

  const [deleteRecurring, { loading: deleting }] = useMutation(DELETE_RECURRING_INCOME, {
    onCompleted: () => {
      toast.success("Income tetap berhasil dihapus");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = (id: string) => {
    deleteRecurring({ variables: { id } });
  };

  const recurringIncomes = data?.recurringIncomes || [];
  const totalMonthly = recurringIncomes
    .filter(r => r.isActive)
    .reduce((sum, r) => sum + r.amount, 0);
  const activeCount = recurringIncomes.filter(r => r.isActive).length;

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
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-[300px]" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-income/10 flex items-center justify-center shrink-0">
            <RefreshCw className="h-5 w-5 text-income" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Pemasukkan Tetap</h1>
            <p className="text-muted-foreground text-sm">Kelola pemasukan tetap bulanan</p>
          </div>
        </div>
        <Button asChild size="sm" className="w-full sm:w-fit">
          <Link href="/recurring-incomes/new">
            <Plus className="h-4 w-4 mr-2" />
            <span className="sm:hidden">Tambah</span>
            <span className="hidden sm:inline">Tambah Pemasukkan Tetap</span>
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bulanan</CardTitle>
            <RefreshCw className="h-4 w-4 text-income" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-income">
              {formatIDR(totalMonthly)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Dari {activeCount} income tetap aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income Tetap</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recurringIncomes.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeCount} aktif, {recurringIncomes.length - activeCount} nonaktif
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Income Tetap List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Income Tetap</CardTitle>
        </CardHeader>
        <CardContent>
          {recurringIncomes.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Belum ada income tetap</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Buat income tetap untuk pemasukan rutin seperti gaji bulanan
              </p>
              <Button asChild>
                <Link href="/recurring-incomes/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Income Tetap
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sumber</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead className="text-center">Tanggal</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurringIncomes.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.sourceName}</TableCell>
                      <TableCell>{item.category.name}</TableCell>
                      <TableCell>{INCOME_TYPE_LABELS[item.incomeType] || item.incomeType}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">Tgl {item.recurringDay}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-income">
                        {formatIDR(item.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/recurring-incomes/${item.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <DeleteConfirmDialog
                            title="Hapus Recurring Income"
                            description={`Apakah kamu yakin ingin menghapus recurring "${item.sourceName}"?`}
                            onConfirm={() => handleDelete(item.id)}
                            loading={deleting}
                            trigger={
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
