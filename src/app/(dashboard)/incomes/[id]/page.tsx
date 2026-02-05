"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GET_INCOME_CATEGORIES, GET_RECURRING_INCOMES, GET_INCOMES } from "@/lib/graphql/queries";
import {
  CREATE_INCOME,
  UPDATE_INCOME,
  DELETE_INCOME,
  CREATE_INCOME_CATEGORY,
} from "@/lib/graphql/mutations";
import { toast } from "sonner";
import { Loader2, ArrowLeft, FolderPlus, RefreshCw, Plus, Trash2 } from "lucide-react";
import { MonthPicker } from "@/components/ui/month-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatIDR } from "@/lib/utils/currency";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

const GET_INCOME = gql`
  query GetIncome($id: UUID!) {
    income(id: $id) {
      id
      sourceName
      amount
      incomeType
      incomeDate
      isRecurring
      notes
      category {
        id
        name
      }
    }
  }
`;

interface IncomeCategory {
  id: string;
  name: string;
}

interface Income {
  id: string;
  sourceName: string;
  amount: number;
  incomeType: string;
  incomeDate: string | null;
  isRecurring: boolean;
  notes: string | null;
  category: IncomeCategory;
}

interface IncomeCategoriesData {
  incomeCategories: IncomeCategory[];
}

interface RecurringIncome {
  id: string;
  sourceName: string;
  amount: number;
  incomeType: string;
  recurringDay: number;
  isActive: boolean;
  notes: string | null;
  category: IncomeCategory;
}

interface RecurringIncomesData {
  recurringIncomes: RecurringIncome[];
}

interface IncomeData {
  income: Income;
}

interface IncomesData {
  incomes: {
    items: Income[];
  };
}

interface IncomeItem {
  id: string;
  categoryId: string;
  categoryName: string;
  sourceName: string;
  amount: number;
  incomeType: string;
  notes: string;
}

const INCOME_TYPES = [
  { value: "SALARY", label: "Gaji" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "BUSINESS", label: "Bisnis" },
  { value: "INVESTMENT", label: "Investasi" },
  { value: "BONUS", label: "Bonus" },
  { value: "REFUND", label: "Refund" },
  { value: "GIFT", label: "Hadiah" },
  { value: "OTHER", label: "Lainnya" },
];

const parseNumber = (value: string): number => {
  return parseInt(value.replace(/\D/g, "")) || 0;
};

export default function IncomeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const isNew = id === "new";
  const monthParam = searchParams.get("month");

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [items, setItems] = useState<IncomeItem[]>([]);
  const [incomeDate, setIncomeDate] = useState(
    monthParam || new Date().toISOString().slice(0, 7)
  );
  const [newCategory, setNewCategory] = useState("");
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  
  // For edit mode only
  const [formData, setFormData] = useState({
    categoryId: "",
    sourceName: "",
    amount: "",
    incomeType: "SALARY",
    notes: "",
  });
  
  // Check if last row is empty (for preventing multiple empty rows)
  const lastItem = items[items.length - 1];
  const isLastRowEmpty = lastItem && !lastItem.categoryId && !lastItem.sourceName && !lastItem.amount;
  
  // Add new empty row
  const handleAddEmptyRow = () => {
    if (isLastRowEmpty) {
      toast.error("Lengkapi item sebelumnya terlebih dahulu");
      return;
    }
    
    const newItem: IncomeItem = {
      id: Date.now().toString(),
      categoryId: "",
      categoryName: "",
      sourceName: "",
      amount: 0,
      incomeType: "SALARY",
      notes: "",
    };
    
    setItems((prev) => [...prev, newItem]);
  };
  
  // Remove item
  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };
  
  // Inline editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const { data: categoriesData, refetch: refetchCategories } =
    useQuery<IncomeCategoriesData>(GET_INCOME_CATEGORIES);

  const { data: recurringData } = useQuery<RecurringIncomesData>(GET_RECURRING_INCOMES, {
    variables: { isActive: true },
    skip: !isNew,
  });

  const { data: incomesData } = useQuery<IncomesData>(GET_INCOMES, {
    skip: !isNew,
  });

  const recurringIncomes = recurringData?.recurringIncomes || [];

  // Get existing months from incomes
  const existingMonths = useMemo(() => new Set<string>(
    (incomesData?.incomes.items || [])
      .map(i => i.incomeDate?.slice(0, 7))
      .filter((v): v is string => Boolean(v))
  ), [incomesData]);

  // Auto-select first available future month (only on initial load)
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (isNew && incomesData && !monthParam && !hasAutoSelected.current) {
      const now = new Date();
      // Check from current month up to 12 months ahead
      for (let i = 0; i <= 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthValue = date.toISOString().slice(0, 7);
        if (!existingMonths.has(monthValue)) {
          setIncomeDate(monthValue);
          hasAutoSelected.current = true;
          break;
        }
      }
    }
  }, [isNew, incomesData, existingMonths, monthParam]);

  const handleSelectRecurring = (recurringId: string) => {
    const recurring = recurringIncomes.find(r => r.id === recurringId);
    if (recurring) {
      const newItem: IncomeItem = {
        id: Date.now().toString(),
        categoryId: recurring.category.id,
        categoryName: recurring.category.name,
        sourceName: recurring.sourceName,
        amount: recurring.amount,
        incomeType: recurring.incomeType,
        notes: recurring.notes || "",
      };
      setItems((prev) => [...prev, newItem]);
      toast.success(`Ditambahkan dari income tetap: ${recurring.sourceName}`);
    }
  };

  const { data: incomeData, loading: loadingIncome } = useQuery<IncomeData>(
    GET_INCOME,
    {
      variables: { id },
      skip: isNew,
    }
  );

  const income = incomeData?.income;
  useEffect(() => {
    if (income) {
      setEditingIncome(income);
      setFormData({
        categoryId: income.category.id,
        sourceName: income.sourceName,
        amount: income.amount.toLocaleString("id-ID"),
        incomeType: income.incomeType,
        notes: income.notes || "",
      });
      setIncomeDate(
        income.incomeDate?.slice(0, 7) || new Date().toISOString().slice(0, 7)
      );
    }
  }, [income]);

  const [createIncome, { loading: creating }] = useMutation(CREATE_INCOME);

  const { refetch: refetchIncome } = useQuery<IncomeData>(
    GET_INCOME,
    {
      variables: { id },
      skip: isNew,
    }
  );

  const [updateIncome, { loading: updating }] = useMutation(UPDATE_INCOME, {
    onCompleted: () => {
      toast.success("Perubahan disimpan");
      setIsSaving(false);
      setEditingField(null);
      refetchIncome();
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSaving(false);
    },
  });

  const [deleteIncome, { loading: deleting }] = useMutation(DELETE_INCOME, {
    onCompleted: () => {
      toast.success("Pemasukan berhasil dihapus");
      router.push("/incomes");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [createCategory, { loading: creatingCategory }] = useMutation(
    CREATE_INCOME_CATEGORY,
    {
      onCompleted: (data) => {
        const result = data as { createIncomeCategory: IncomeCategory };
        toast.success("Kategori berhasil ditambahkan");
        setIsCategoryOpen(false);
        setNewCategory("");
        refetchCategories();
        setFormData((prev) => ({
          ...prev,
          categoryId: result.createIncomeCategory.id,
        }));
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const categories: IncomeCategory[] = categoriesData?.incomeCategories || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isNew) {
      // Filter out empty items
      const validItems = items.filter(
        (item) => item.categoryId && item.sourceName && item.amount
      );

      if (validItems.length === 0) {
        toast.error("Mohon tambahkan minimal satu pemasukan");
        return;
      }

      try {
        // Create all incomes in parallel
        await Promise.all(
          validItems.map(item =>
            createIncome({
              variables: {
                input: {
                  categoryId: item.categoryId,
                  sourceName: item.sourceName,
                  amount: item.amount,
                  incomeType: item.incomeType,
                  incomeDate: incomeDate ? `${incomeDate}-01T00:00:00Z` : null,
                  notes: item.notes || null,
                },
              },
            })
          )
        );
        
        toast.success(`${validItems.length} pemasukan berhasil ditambahkan`);
        router.push(`/incomes/month/${incomeDate}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Gagal menyimpan pemasukan";
        toast.error(message);
      }
      return;
    } else {
      // Edit mode - use formData
      if (!formData.categoryId || !formData.sourceName || !formData.amount) {
        toast.error("Mohon lengkapi kategori, sumber, dan jumlah");
        return;
      }

      const input = {
        categoryId: formData.categoryId,
        sourceName: formData.sourceName,
        amount: parseNumber(formData.amount),
        incomeType: formData.incomeType,
        incomeDate: incomeDate ? `${incomeDate}-01T00:00:00Z` : null,
        notes: formData.notes || null,
      };
      updateIncome({ variables: { id, input } });
    }
  };

  const handleDelete = () => {
    deleteIncome({ variables: { id } });
  };

  // Inline editing handlers
  const startEditing = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const saveInlineEdit = async (field: string) => {
    if (!editingIncome) return;
    
    let newValue: string | number = editValue;
    
    if (field === "amount") {
      newValue = parseInt(editValue.replace(/\D/g, "")) || 0;
      if (newValue <= 0) {
        setEditingField(null);
        return;
      }
    }
    
    if (field === "sourceName" && !editValue.trim()) {
      setEditingField(null);
      return;
    }
    
    setIsSaving(true);
    setEditingField(null);
    
    const input: Record<string, unknown> = {
      categoryId: editingIncome.category.id,
    };
    
    if (field === "sourceName") {
      input.sourceName = editValue.trim();
    } else if (field === "amount") {
      input.amount = newValue;
    }
    
    await updateIncome({ variables: { id, input } });
  };

  const handleInlineCategoryChange = async (categoryId: string) => {
    if (!editingIncome || categoryId === editingIncome.category.id) return;
    
    setIsSaving(true);
    await updateIncome({
      variables: {
        id,
        input: { categoryId },
      },
    });
  };

  const handleInlineTypeChange = async (incomeType: string) => {
    if (!editingIncome || incomeType === editingIncome.incomeType) return;
    
    setIsSaving(true);
    await updateIncome({
      variables: {
        id,
        input: { 
          categoryId: editingIncome.category.id,
          incomeType 
        },
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === "Enter") {
      saveInlineEdit(field);
    } else if (e.key === "Escape") {
      setEditingField(null);
    }
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) {
      toast.error("Nama kategori tidak boleh kosong");
      return;
    }
    createCategory({
      variables: {
        input: { name: newCategory.trim() },
      },
    });
  };

  const isLoading = creating || updating || deleting;

  if (!isNew && loadingIncome) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        {/* Form Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-48" />
          </CardContent>
        </Card>

        {/* Total Card Skeleton */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-40" />
            </div>
            <Skeleton className="h-10 w-40" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isNew ? "Tambah Pemasukan" : "Edit Pemasukan"}
            </h1>
            <p className="text-muted-foreground">
              {isNew ? "Catat pemasukan baru" : "Ubah detail pemasukan"}
            </p>
          </div>
        </div>
        {!isNew && (
          <DeleteConfirmDialog
            title="Hapus Pemasukan"
            description="Apakah kamu yakin ingin menghapus pemasukan ini?"
            onConfirm={handleDelete}
            loading={deleting}
          />
        )}
      </div>

      {/* Edit Mode - Inline Editing */}
      {!isNew && editingIncome && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Detail Pemasukan
              {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Kategori</Label>
                  <Select
                    value={editingIncome.category.id}
                    onValueChange={handleInlineCategoryChange}
                    disabled={isSaving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Tipe Pemasukan</Label>
                  <Select
                    value={editingIncome.incomeType}
                    onValueChange={handleInlineTypeChange}
                    disabled={isSaving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INCOME_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Sumber Pemasukan</Label>
                  {editingField === "sourceName" ? (
                    <Input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveInlineEdit("sourceName")}
                      onKeyDown={(e) => handleKeyDown(e, "sourceName")}
                      disabled={isSaving}
                    />
                  ) : (
                    <div
                      className="h-10 px-3 flex items-center border rounded-md cursor-pointer hover:bg-muted/50 font-medium"
                      onClick={() => startEditing("sourceName", editingIncome.sourceName)}
                    >
                      {editingIncome.sourceName}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Jumlah</Label>
                  {editingField === "amount" ? (
                    <Input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ""))}
                      onBlur={() => saveInlineEdit("amount")}
                      onKeyDown={(e) => handleKeyDown(e, "amount")}
                      disabled={isSaving}
                    />
                  ) : (
                    <div
                      className="h-10 px-3 flex items-center border rounded-md cursor-pointer hover:bg-muted/50 font-bold text-income"
                      onClick={() => startEditing("amount", editingIncome.amount.toString())}
                    >
                      {formatIDR(editingIncome.amount)}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Klik pada field untuk mengedit. Perubahan disimpan otomatis.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Mode - Editable Table */}
      {isNew && (
        <>
          {/* Archive Input - Date */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Bulan Pemasukan</CardTitle>
              {recurringIncomes.length > 0 && (
                <Select onValueChange={handleSelectRecurring}>
                  <SelectTrigger className="w-[200px]">
                    <RefreshCw className="h-4 w-4 mr-2 text-income" />
                    <SelectValue placeholder="Dari Recurring" />
                  </SelectTrigger>
                  <SelectContent>
                    {recurringIncomes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.sourceName} - {formatIDR(r.amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <MonthPicker
                  value={incomeDate}
                  onChange={setIncomeDate}
                  disabledMonths={existingMonths}
                  className="max-w-xs"
                />
                {existingMonths.has(incomeDate) && (
                  <p className="text-sm text-destructive">
                    Bulan ini sudah memiliki data. Silakan pilih bulan lain atau update data yang sudah ada.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Editable Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detail Pemasukan</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Kategori</TableHead>
                    <TableHead className="min-w-[150px]">Sumber</TableHead>
                    <TableHead className="min-w-[120px]">Tipe</TableHead>
                    <TableHead className="min-w-[180px] text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Render all items */}
                  {items.map((item) => (
                    <TableRow key={item.id} className="bg-muted/30">
                      <TableCell>
                        <div className="flex gap-1">
                          <Select
                            value={item.categoryId}
                            onValueChange={(value) => {
                              const cat = categories.find((c) => c.id === value);
                              setItems((prev) =>
                                prev.map((i) =>
                                  i.id === item.id
                                    ? { ...i, categoryId: value, categoryName: cat?.name || "" }
                                    : i
                                )
                              );
                            }}
                          >
                            <SelectTrigger className="h-9 min-w-[140px]">
                              <SelectValue placeholder="Kategori" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
                            <DialogTrigger asChild>
                              <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0">
                                <FolderPlus className="h-3 w-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Tambah Kategori Pemasukan</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={handleCreateCategory} className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Nama Kategori</Label>
                                  <Input
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    placeholder="Contoh: Pekerjaan Utama"
                                  />
                                </div>
                                <Button type="submit" className="w-full" disabled={creatingCategory}>
                                  {creatingCategory && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                  Simpan
                                </Button>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.sourceName}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((i) =>
                                i.id === item.id ? { ...i, sourceName: e.target.value } : i
                              )
                            )
                          }
                          className="h-9 min-w-[120px]"
                          placeholder="Sumber pemasukan"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.incomeType}
                          onValueChange={(value) =>
                            setItems((prev) =>
                              prev.map((i) =>
                                i.id === item.id ? { ...i, incomeType: value } : i
                              )
                            )
                          }
                        >
                          <SelectTrigger className="h-9 min-w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INCOME_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            value={item.amount ? item.amount.toLocaleString("id-ID") : ""}
                            onChange={(e) => {
                              const val = parseNumber(e.target.value);
                              setItems((prev) =>
                                prev.map((i) =>
                                  i.id === item.id ? { ...i, amount: val } : i
                                )
                              );
                            }}
                            className="h-9 text-right font-bold text-income min-w-[120px]"
                            placeholder="0"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Add new row button - ALWAYS visible */}
                  <TableRow
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={handleAddEmptyRow}
                  >
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Plus className="h-4 w-4" />
                        <span>Tambah pemasukan baru</span>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
                  <Button type="submit" className="w-full sm:w-fit" disabled={isLoading || items.filter(i => i.categoryId && i.sourceName && i.amount).length === 0}>
                    {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Simpan {items.filter(i => i.categoryId && i.sourceName && i.amount).length} Pemasukan
                  </Button>
                  <div className="text-center sm:text-right w-full sm:w-auto">
                    <p className="text-sm text-muted-foreground">Total Pemasukan</p>
                    <p className="text-2xl font-bold text-income">
                      {formatIDR(items.reduce((sum, item) => sum + item.amount, 0))}
                    </p>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
