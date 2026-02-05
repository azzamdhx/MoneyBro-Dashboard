"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/utils/currency";
import { GET_EXPENSE_TEMPLATE_GROUPS } from "@/lib/graphql/queries";
import { DELETE_EXPENSE_TEMPLATE_GROUP } from "@/lib/graphql/mutations";
import { Plus, FileText, Calendar, Trash2, Edit } from "lucide-react";
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

interface ExpenseTemplateItem {
  id: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  total: number;
  category: {
    id: string;
    name: string;
  };
}

interface ExpenseTemplateGroup {
  id: string;
  name: string;
  recurringDay: number | null;
  notes: string | null;
  total: number;
  createdAt: string;
  items: ExpenseTemplateItem[];
}

interface ExpenseTemplateGroupsData {
  expenseTemplateGroups: ExpenseTemplateGroup[];
}

export default function ExpenseTemplatesPage() {
  const router = useRouter();
  const { data, loading, refetch } = useQuery<ExpenseTemplateGroupsData>(GET_EXPENSE_TEMPLATE_GROUPS);

  const [deleteGroup, { loading: deleting }] = useMutation(DELETE_EXPENSE_TEMPLATE_GROUP, {
    onCompleted: () => {
      toast.success("Template berhasil dihapus");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = (id: string) => {
    deleteGroup({ variables: { id } });
  };

  const groups = data?.expenseTemplateGroups || [];
  const recurringCount = groups.filter(g => g.recurringDay !== null).length;

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
          <div className="h-10 w-10 rounded-lg bg-expense/10 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-expense" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Template Pengeluaran</h1>
            <p className="text-muted-foreground text-sm">Kelola template untuk input cepat</p>
          </div>
        </div>
        <Button asChild size="sm" className="w-full sm:w-fit">
          <Link href="/expense-templates/new">
            <Plus className="h-4 w-4 mr-2" />
            <span className="sm:hidden">Tambah</span>
            <span className="hidden sm:inline">Tambah Template</span>
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Template</CardTitle>
            <FileText className="h-4 w-4 text-expense" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {groups.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Template tersedia untuk input cepat
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dengan Jadwal Bulanan</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recurringCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Template dengan jadwal bulanan
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Template List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Template</CardTitle>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Belum ada template</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Buat template untuk pengeluaran rutin seperti listrik, air, internet
              </p>
              <Button asChild>
                <Link href="/expense-templates/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Template
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Template</TableHead>
                    <TableHead className="text-center">Jumlah Item</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Jadwal</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell className="text-center">{group.items.length} item</TableCell>
                      <TableCell className="text-right font-medium text-expense">
                        {formatIDR(group.total)}
                      </TableCell>
                      <TableCell className="text-center">
                        {group.recurringDay ? (
                          <Badge variant="outline">Tgl {group.recurringDay}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/expense-templates/${group.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <DeleteConfirmDialog
                            title="Hapus Template"
                            description={`Apakah kamu yakin ingin menghapus template "${group.name}"?`}
                            onConfirm={() => handleDelete(group.id)}
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
