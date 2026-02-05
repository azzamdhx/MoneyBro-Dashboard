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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GET_CATEGORIES, GET_EXPENSE_TEMPLATE_GROUPS, GET_EXPENSES } from "@/lib/graphql/queries";
import { CREATE_EXPENSE, UPDATE_EXPENSE, DELETE_EXPENSE, CREATE_CATEGORY } from "@/lib/graphql/mutations";
import { toast } from "sonner";
import { Loader2, ArrowLeft, FolderPlus, Trash2, Plus, FileText } from "lucide-react";
import { MonthPicker } from "@/components/ui/month-picker";
import { formatIDR } from "@/lib/utils/currency";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

const GET_EXPENSE = gql`
  query GetExpense($id: UUID!) {
    expense(id: $id) {
      id
      itemName
      unitPrice
      quantity
      total
      notes
      expenseDate
      category {
        id
        name
      }
    }
  }
`;

interface Category {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  total: number;
  notes: string | null;
  expenseDate: string | null;
  category: Category;
}

interface CategoriesData {
  categories: Category[];
}

interface ExpenseTemplateItem {
  id: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  total: number;
  category: Category;
}

interface ExpenseTemplateGroup {
  id: string;
  name: string;
  items: ExpenseTemplateItem[];
}

interface ExpenseTemplateGroupsData {
  expenseTemplateGroups: ExpenseTemplateGroup[];
}

interface ExpenseData {
  expense: Expense;
}

interface ExpensesData {
  expenses: {
    items: Expense[];
  };
}

interface ExpenseItem {
  id: string;
  categoryId: string;
  categoryName: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  notes: string;
}

const parseNumber = (value: string): number => {
  return parseInt(value.replace(/\D/g, "")) || 0;
};

export default function ExpenseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const isNew = id === "new";
  const monthParam = searchParams.get("month");

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [expenseDate, setExpenseDate] = useState(
    monthParam || new Date().toISOString().slice(0, 7) // Format: YYYY-MM
  );
  const [newCategory, setNewCategory] = useState("");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  // For edit mode only
  const [currentItem, setCurrentItem] = useState({
    categoryId: "",
    itemName: "",
    unitPrice: "",
    quantity: "1",
    notes: "",
  });
  
  // Check if last row is empty (for preventing multiple empty rows)
  const lastItem = items[items.length - 1];
  const isLastRowEmpty = lastItem && !lastItem.categoryId && !lastItem.itemName && !lastItem.unitPrice;
  
  // Add new empty row
  const handleAddEmptyRow = () => {
    if (isLastRowEmpty) {
      toast.error("Lengkapi item sebelumnya terlebih dahulu");
      return;
    }
    
    const newItem: ExpenseItem = {
      id: crypto.randomUUID(),
      categoryId: "",
      categoryName: "",
      itemName: "",
      unitPrice: 0,
      quantity: 1,
      notes: "",
    };
    
    setItems((prev) => [...prev, newItem]);
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

  const { data: categoriesData, refetch: refetchCategories } = useQuery<CategoriesData>(GET_CATEGORIES);

  const { data: templateGroupsData } = useQuery<ExpenseTemplateGroupsData>(GET_EXPENSE_TEMPLATE_GROUPS, {
    skip: !isNew,
  });

  const { data: expensesData } = useQuery<ExpensesData>(GET_EXPENSES, {
    skip: !isNew,
  });

  const templateGroups = templateGroupsData?.expenseTemplateGroups || [];
  
  // Get existing months from expenses
  const existingMonths = useMemo(() => new Set<string>(
    (expensesData?.expenses.items || [])
      .map(e => e.expenseDate?.slice(0, 7))
      .filter((v): v is string => Boolean(v))
  ), [expensesData]);

  // Auto-select first available future month (only on initial load)
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (isNew && expensesData && !monthParam && !hasAutoSelected.current) {
      const now = new Date();
      // Check from current month up to 12 months ahead
      for (let i = 0; i <= 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthValue = date.toISOString().slice(0, 7);
        if (!existingMonths.has(monthValue)) {
          setExpenseDate(monthValue);
          hasAutoSelected.current = true;
          break;
        }
      }
    }
  }, [isNew, expensesData, existingMonths, monthParam]);

  const handleSelectTemplateGroup = (groupId: string) => {
    const group = templateGroups.find(g => g.id === groupId);
    if (group && group.items.length > 0) {
      const newItems: ExpenseItem[] = group.items.map(item => ({
        id: crypto.randomUUID(),
        categoryId: item.category.id,
        categoryName: item.category.name,
        itemName: item.itemName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        notes: "",
      }));
      setItems(newItems);
      toast.success(`${group.items.length} item ditambahkan dari template: ${group.name}`);
    }
  };
  
  const { data: expenseData, loading: loadingExpense } = useQuery<ExpenseData>(GET_EXPENSE, {
    variables: { id },
    skip: isNew,
  });

  const expense = expenseData?.expense;
  useEffect(() => {
    if (expense) {
      setEditingExpense(expense);
      setCurrentItem({
        categoryId: expense.category.id,
        itemName: expense.itemName,
        unitPrice: expense.unitPrice.toLocaleString("id-ID"),
        quantity: expense.quantity.toString(),
        notes: expense.notes || "",
      });
      setExpenseDate(expense.expenseDate?.slice(0, 7) || new Date().toISOString().slice(0, 7));
    }
  }, [expense]);

  const [createExpense, { loading: creating }] = useMutation(CREATE_EXPENSE);

  const { refetch: refetchExpense } = useQuery<ExpenseData>(GET_EXPENSE, {
    variables: { id },
    skip: isNew,
  });

  const [updateExpense, { loading: updating }] = useMutation(UPDATE_EXPENSE, {
    onCompleted: () => {
      toast.success("Perubahan disimpan");
      setIsSaving(false);
      setEditingField(null);
      refetchExpense();
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSaving(false);
    },
  });

  const [deleteExpense, { loading: deleting }] = useMutation(DELETE_EXPENSE, {
    onCompleted: () => {
      toast.success("Pengeluaran berhasil dihapus");
      router.push("/expenses");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [createCategory, { loading: creatingCategory }] = useMutation(CREATE_CATEGORY, {
    onCompleted: (data) => {
      const result = data as { createCategory: Category };
      toast.success("Kategori berhasil ditambahkan");
      setIsCategoryOpen(false);
      setNewCategory("");
      refetchCategories();
      setCurrentItem((prev) => ({ ...prev, categoryId: result.createCategory.id }));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const categories: Category[] = categoriesData?.categories || [];

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isNew && editingExpense) {
      const input = {
        categoryId: currentItem.categoryId,
        itemName: currentItem.itemName,
        unitPrice: parseNumber(currentItem.unitPrice),
        quantity: parseInt(currentItem.quantity) || 1,
        notes: currentItem.notes || null,
        expenseDate: expenseDate ? `${expenseDate}-01T00:00:00Z` : null,
      };
      updateExpense({ variables: { id, input } });
      return;
    }

    if (items.length === 0) {
      toast.error("Tambahkan minimal 1 item pengeluaran");
      return;
    }

    try {
      const validItems = items.filter(i => i.categoryId && i.itemName && i.unitPrice);
      
      await Promise.all(
        validItems.map(item =>
          createExpense({
            variables: {
              input: {
                categoryId: item.categoryId,
                itemName: item.itemName,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                notes: item.notes || null,
                expenseDate: expenseDate ? `${expenseDate}-01T00:00:00Z` : null,
              },
            },
          })
        )
      );
      
      toast.success(`${validItems.length} pengeluaran berhasil ditambahkan`);
      router.push(`/expenses/month/${expenseDate}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan pengeluaran";
      toast.error(message);
      console.error("Create expense error:", err);
    }
  };

  const handleDelete = () => {
    deleteExpense({ variables: { id } });
  };

  // Inline editing handlers
  const startEditing = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const saveInlineEdit = async (field: string) => {
    if (!editingExpense) return;
    
    let newValue: string | number = editValue;
    
    if (field === "unitPrice" || field === "quantity") {
      newValue = parseInt(editValue.replace(/\D/g, "")) || 0;
      if (newValue <= 0) {
        setEditingField(null);
        return;
      }
    }
    
    if (field === "itemName" && !editValue.trim()) {
      setEditingField(null);
      return;
    }
    
    const currentValue = field === "unitPrice" 
      ? editingExpense.unitPrice 
      : field === "quantity" 
      ? editingExpense.quantity 
      : editingExpense.itemName;
    
    if (currentValue === newValue || currentValue.toString() === editValue) {
      setEditingField(null);
      return;
    }
    
    setIsSaving(true);
    setEditingField(null);
    
    const input: Record<string, unknown> = {
      categoryId: editingExpense.category.id,
    };
    
    if (field === "itemName") {
      input.itemName = editValue.trim();
    } else if (field === "unitPrice") {
      input.unitPrice = newValue;
    } else if (field === "quantity") {
      input.quantity = newValue;
    }
    
    await updateExpense({ variables: { id, input } });
  };

  const handleInlineCategoryChange = async (categoryId: string) => {
    if (!editingExpense || categoryId === editingExpense.category.id) return;
    
    setIsSaving(true);
    await updateExpense({
      variables: {
        id,
        input: { categoryId },
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

  const currentItemTotal = parseNumber(currentItem.unitPrice) * (parseInt(currentItem.quantity) || 1);
  const grandTotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const isLoading = creating || updating || deleting;

  if (!isNew && loadingExpense) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <Skeleton className="h-10 w-48" />

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
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
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
              {isNew ? "Perencanaan Pengeluaran" : "Edit Pengeluaran"}
            </h1>
            <p className="text-muted-foreground">
              {isNew ? "Rencanakan pengeluaran bulanan kamu" : "Ubah detail pengeluaran"}
            </p>
          </div>
        </div>
        {!isNew && (
          <DeleteConfirmDialog
            title="Hapus Pengeluaran"
            description="Apakah kamu yakin ingin menghapus pengeluaran ini?"
            onConfirm={handleDelete}
            loading={deleting}
          />
        )}
      </div>

      {isNew ? (
        <div className="space-y-2">
          <Label>Bulan Pengeluaran</Label>
          <MonthPicker
            value={expenseDate}
            onChange={setExpenseDate}
            disabledMonths={existingMonths}
            className="max-w-xs"
          />
          {existingMonths.has(expenseDate) && (
            <p className="text-sm text-destructive">
              Bulan ini sudah memiliki data. Silakan pilih bulan lain atau update data yang sudah ada.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Bulan Pengeluaran</Label>
          <Input
            type="month"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="max-w-xs"
          />
        </div>
      )}

      {/* Edit Mode - Inline Editing */}
      {!isNew && editingExpense && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Detail Item
              {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Kategori</Label>
                  <Select
                    value={editingExpense.category.id}
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
                  <Label className="text-muted-foreground text-xs">Nama Item</Label>
                  {editingField === "itemName" ? (
                    <Input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveInlineEdit("itemName")}
                      onKeyDown={(e) => handleKeyDown(e, "itemName")}
                      disabled={isSaving}
                    />
                  ) : (
                    <div
                      className="h-10 px-3 flex items-center border rounded-md cursor-pointer hover:bg-muted/50 font-medium"
                      onClick={() => startEditing("itemName", editingExpense.itemName)}
                    >
                      {editingExpense.itemName}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Harga Satuan</Label>
                  {editingField === "unitPrice" ? (
                    <Input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ""))}
                      onBlur={() => saveInlineEdit("unitPrice")}
                      onKeyDown={(e) => handleKeyDown(e, "unitPrice")}
                      disabled={isSaving}
                    />
                  ) : (
                    <div
                      className="h-10 px-3 flex items-center border rounded-md cursor-pointer hover:bg-muted/50 font-medium"
                      onClick={() => startEditing("unitPrice", editingExpense.unitPrice.toString())}
                    >
                      {formatIDR(editingExpense.unitPrice)}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Jumlah</Label>
                  {editingField === "quantity" ? (
                    <Input
                      ref={inputRef}
                      type="number"
                      min="1"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveInlineEdit("quantity")}
                      onKeyDown={(e) => handleKeyDown(e, "quantity")}
                      disabled={isSaving}
                    />
                  ) : (
                    <div
                      className="h-10 px-3 flex items-center border rounded-md cursor-pointer hover:bg-muted/50 font-medium"
                      onClick={() => startEditing("quantity", editingExpense.quantity.toString())}
                    >
                      {editingExpense.quantity}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Total</Label>
                  <div className="h-10 px-3 flex items-center bg-expense/10 border border-expense/20 rounded-md font-bold text-expense">
                    {formatIDR(editingExpense.total)}
                  </div>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Daftar Pengeluaran</CardTitle>
            {templateGroups.length > 0 && (
              <Select onValueChange={handleSelectTemplateGroup}>
                <SelectTrigger className="w-[220px]">
                  <FileText className="h-4 w-4 mr-2 text-expense" />
                  <SelectValue placeholder="Dari Template" />
                </SelectTrigger>
                <SelectContent>
                  {templateGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} ({g.items.length} item)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Kategori</TableHead>
                  <TableHead className="min-w-[150px]">Item</TableHead>
                  <TableHead className="min-w-[120px]">Harga</TableHead>
                  <TableHead className="min-w-[70px]">Qty</TableHead>
                  <TableHead className="min-w-[120px] text-right">Subtotal</TableHead>
                  <TableHead className="min-w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="bg-muted/30">
                    <TableCell>
                      <div className="flex gap-1">
                        <Select
                          value={item.categoryId}
                          onValueChange={(value) => {
                            const cat = categories.find(c => c.id === value);
                            setItems(prev => prev.map(i => 
                              i.id === item.id ? { ...i, categoryId: value, categoryName: cat?.name || "" } : i
                            ));
                          }}
                        >
                          <SelectTrigger className="h-8 min-w-[140px]">
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
                            <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0">
                              <FolderPlus className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Tambah Kategori</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateCategory} className="space-y-4">
                              <div className="space-y-2">
                                <Label>Nama Kategori</Label>
                                <Input
                                  value={newCategory}
                                  onChange={(e) => setNewCategory(e.target.value)}
                                  placeholder="Contoh: Makanan"
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
                        value={item.itemName}
                        onChange={(e) => setItems(prev => prev.map(i => 
                          i.id === item.id ? { ...i, itemName: e.target.value } : i
                        ))}
                        className="h-8 min-w-[120px]"
                        placeholder="Nama item"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.unitPrice ? item.unitPrice.toLocaleString("id-ID") : ""}
                        onChange={(e) => {
                          const val = parseNumber(e.target.value);
                          setItems(prev => prev.map(i => 
                            i.id === item.id ? { ...i, unitPrice: val } : i
                          ));
                        }}
                        className="h-8 text-right min-w-[100px]"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => setItems(prev => prev.map(i => 
                          i.id === item.id ? { ...i, quantity: parseInt(e.target.value) || 1 } : i
                        ))}
                        className="h-8 text-center min-w-[60px]"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium text-expense">
                      {formatIDR(item.unitPrice * item.quantity)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Add new row button - ALWAYS visible */}
                <TableRow
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={handleAddEmptyRow}
                >
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span>Tambah item baru</span>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
              <Button type="submit" className="w-full sm:w-fit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isNew ? `Simpan ${items.filter(i => i.categoryId && i.itemName && i.unitPrice).length} Pengeluaran` : "Perbarui Pengeluaran"}
              </Button>
              <div className="text-center sm:text-right w-full sm:w-auto">
                <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
                <p className="text-2xl font-bold text-expense">
                  {formatIDR(isNew ? grandTotal : currentItemTotal)}
                </p>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
