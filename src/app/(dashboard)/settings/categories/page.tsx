"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@apollo/client/react";
import { GET_CATEGORIES, GET_INCOME_CATEGORIES } from "@/lib/graphql/queries";
import {
  CREATE_CATEGORY,
  UPDATE_CATEGORY,
  DELETE_CATEGORY,
  CREATE_INCOME_CATEGORY,
  UPDATE_INCOME_CATEGORY,
  DELETE_INCOME_CATEGORY,
} from "@/lib/graphql/mutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "sonner";
import {
  ChevronLeft,
  Plus,
  Pencil,
  X,
  Check,
  Loader2,
  Wallet,
  Receipt,
} from "lucide-react";

interface ExpenseCategory {
  id: string;
  name: string;
  expenseCount: number;
  totalSpent: number;
}

interface IncomeCategory {
  id: string;
  name: string;
  createdAt: string;
}

interface CategoriesData {
  categories: ExpenseCategory[];
}

interface IncomeCategoriesData {
  incomeCategories: IncomeCategory[];
}

function CategoryItem({
  name,
  subtitle,
  isEditing,
  editValue,
  onEditChange,
  onSave,
  onCancel,
  onStartEdit,
  onDelete,
  saving,
  deleting,
}: {
  name: string;
  subtitle?: string;
  isEditing: boolean;
  editValue: string;
  onEditChange: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
}) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-3">
        <Input
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          className="h-9 flex-1"
          placeholder="Nama kategori"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onCancel();
          }}
        />
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onCancel} disabled={saving}>
          <X className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-primary" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 group">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{name}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onStartEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <DeleteConfirmDialog
          title="Hapus Kategori"
          description={`Apakah kamu yakin ingin menghapus kategori "${name}"?`}
          onConfirm={onDelete}
          loading={deleting}
          variant="icon"
        />
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newIncomeName, setNewIncomeName] = useState("");
  const [showNewExpense, setShowNewExpense] = useState(false);
  const [showNewIncome, setShowNewIncome] = useState(false);

  // Expense categories
  const { data: expenseData, loading: loadingExpense } = useQuery<CategoriesData>(GET_CATEGORIES);
  const [createCategory, { loading: creatingExpense }] = useMutation(CREATE_CATEGORY, {
    refetchQueries: [{ query: GET_CATEGORIES }],
  });
  const [updateCategory, { loading: updatingExpense }] = useMutation(UPDATE_CATEGORY, {
    refetchQueries: [{ query: GET_CATEGORIES }],
  });
  const [deleteCategory, { loading: deletingExpense }] = useMutation(DELETE_CATEGORY, {
    refetchQueries: [{ query: GET_CATEGORIES }],
  });

  // Income categories
  const { data: incomeData, loading: loadingIncome } = useQuery<IncomeCategoriesData>(GET_INCOME_CATEGORIES);
  const [createIncomeCategory, { loading: creatingIncome }] = useMutation(CREATE_INCOME_CATEGORY, {
    refetchQueries: [{ query: GET_INCOME_CATEGORIES }],
  });
  const [updateIncomeCategory, { loading: updatingIncome }] = useMutation(UPDATE_INCOME_CATEGORY, {
    refetchQueries: [{ query: GET_INCOME_CATEGORIES }],
  });
  const [deleteIncomeCategory, { loading: deletingIncome }] = useMutation(DELETE_INCOME_CATEGORY, {
    refetchQueries: [{ query: GET_INCOME_CATEGORIES }],
  });

  const expenseCategories = expenseData?.categories || [];
  const incomeCategories = incomeData?.incomeCategories || [];

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditValue(name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  // Expense category handlers
  const handleSaveExpenseCategory = async (id: string) => {
    if (!editValue.trim()) {
      toast.error("Nama kategori tidak boleh kosong");
      return;
    }
    try {
      await updateCategory({ variables: { id, input: { name: editValue.trim() } } });
      toast.success("Kategori berhasil diperbarui");
      handleCancelEdit();
    } catch {
      toast.error("Gagal memperbarui kategori");
    }
  };

  const handleCreateExpenseCategory = async () => {
    if (!newExpenseName.trim()) {
      toast.error("Nama kategori tidak boleh kosong");
      return;
    }
    try {
      await createCategory({ variables: { input: { name: newExpenseName.trim() } } });
      toast.success("Kategori pengeluaran berhasil ditambahkan");
      setNewExpenseName("");
      setShowNewExpense(false);
    } catch {
      toast.error("Gagal menambahkan kategori");
    }
  };

  const handleDeleteExpenseCategory = async (id: string) => {
    try {
      await deleteCategory({ variables: { id } });
      toast.success("Kategori berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus kategori. Pastikan tidak ada pengeluaran yang menggunakan kategori ini.");
    }
  };

  // Income category handlers
  const handleSaveIncomeCategory = async (id: string) => {
    if (!editValue.trim()) {
      toast.error("Nama kategori tidak boleh kosong");
      return;
    }
    try {
      await updateIncomeCategory({ variables: { id, input: { name: editValue.trim() } } });
      toast.success("Kategori berhasil diperbarui");
      handleCancelEdit();
    } catch {
      toast.error("Gagal memperbarui kategori");
    }
  };

  const handleCreateIncomeCategory = async () => {
    if (!newIncomeName.trim()) {
      toast.error("Nama kategori tidak boleh kosong");
      return;
    }
    try {
      await createIncomeCategory({ variables: { input: { name: newIncomeName.trim() } } });
      toast.success("Kategori pemasukan berhasil ditambahkan");
      setNewIncomeName("");
      setShowNewIncome(false);
    } catch {
      toast.error("Gagal menambahkan kategori");
    }
  };

  const handleDeleteIncomeCategory = async (id: string) => {
    try {
      await deleteIncomeCategory({ variables: { id } });
      toast.success("Kategori berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus kategori. Pastikan tidak ada pemasukan yang menggunakan kategori ini.");
    }
  };

  if (loadingExpense || loadingIncome) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <div className="rounded-xl border bg-card divide-y divide-border">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-4 w-32 flex-1" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Kelola Kategori</h1>
          <p className="text-muted-foreground">Atur kategori pemasukan dan pengeluaran</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expense Categories */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-expense" />
                <CardTitle className="text-base">Pengeluaran</CardTitle>
                <span className="text-xs text-muted-foreground">({expenseCategories.length})</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setShowNewExpense(true);
                  setShowNewIncome(false);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-lg border divide-y divide-border">
              {showNewExpense && (
                <div className="flex items-center gap-2 p-3 bg-muted/30">
                  <Input
                    value={newExpenseName}
                    onChange={(e) => setNewExpenseName(e.target.value)}
                    className="h-9 flex-1"
                    placeholder="Nama kategori baru"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateExpenseCategory();
                      if (e.key === "Escape") {
                        setShowNewExpense(false);
                        setNewExpenseName("");
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => {
                      setShowNewExpense(false);
                      setNewExpenseName("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-primary"
                    onClick={handleCreateExpenseCategory}
                    disabled={creatingExpense}
                  >
                    {creatingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                </div>
              )}
              {expenseCategories.length === 0 && !showNewExpense ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Belum ada kategori pengeluaran
                </div>
              ) : (
                expenseCategories.map((cat) => (
                  <CategoryItem
                    key={cat.id}
                    name={cat.name}
                    subtitle={cat.expenseCount > 0 ? `${cat.expenseCount} transaksi` : undefined}
                    isEditing={editingId === cat.id}
                    editValue={editValue}
                    onEditChange={setEditValue}
                    onSave={() => handleSaveExpenseCategory(cat.id)}
                    onCancel={handleCancelEdit}
                    onStartEdit={() => handleStartEdit(cat.id, cat.name)}
                    onDelete={() => handleDeleteExpenseCategory(cat.id)}
                    saving={updatingExpense}
                    deleting={deletingExpense}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Income Categories */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-income" />
                <CardTitle className="text-base">Pemasukan</CardTitle>
                <span className="text-xs text-muted-foreground">({incomeCategories.length})</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setShowNewIncome(true);
                  setShowNewExpense(false);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-lg border divide-y divide-border">
              {showNewIncome && (
                <div className="flex items-center gap-2 p-3 bg-muted/30">
                  <Input
                    value={newIncomeName}
                    onChange={(e) => setNewIncomeName(e.target.value)}
                    className="h-9 flex-1"
                    placeholder="Nama kategori baru"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateIncomeCategory();
                      if (e.key === "Escape") {
                        setShowNewIncome(false);
                        setNewIncomeName("");
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => {
                      setShowNewIncome(false);
                      setNewIncomeName("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-primary"
                    onClick={handleCreateIncomeCategory}
                    disabled={creatingIncome}
                  >
                    {creatingIncome ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                </div>
              )}
              {incomeCategories.length === 0 && !showNewIncome ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Belum ada kategori pemasukan
                </div>
              ) : (
                incomeCategories.map((cat) => (
                  <CategoryItem
                    key={cat.id}
                    name={cat.name}
                    isEditing={editingId === cat.id}
                    editValue={editValue}
                    onEditChange={setEditValue}
                    onSave={() => handleSaveIncomeCategory(cat.id)}
                    onCancel={handleCancelEdit}
                    onStartEdit={() => handleStartEdit(cat.id, cat.name)}
                    onDelete={() => handleDeleteIncomeCategory(cat.id)}
                    saving={updatingIncome}
                    deleting={deletingIncome}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
