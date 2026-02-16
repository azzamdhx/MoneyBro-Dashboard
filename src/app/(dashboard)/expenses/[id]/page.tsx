"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
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
import { CREATE_EXPENSE, CREATE_CATEGORY } from "@/lib/graphql/mutations";
import { toast } from "sonner";
import { Loader2, ArrowLeft, FolderPlus, Trash2, Plus, FileText } from "lucide-react";
import { MonthPicker } from "@/components/ui/month-picker";
import { formatIDR } from "@/lib/utils/currency";
import { formatNumberID, toRFC3339 } from "@/lib/utils/format";

interface Category {
  id: string;
  name: string;
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

interface ExpensesData {
  expenses: {
    items: {
      id: string;
      expenseDate: string | null;
    }[];
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

export default function CreateExpensePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const monthParam = searchParams.get("month");

  // Redirect if not creating new — editing is handled in month/[monthKey]/page.tsx
  useEffect(() => {
    if (id !== "new") {
      router.replace("/expenses");
    }
  }, [id, router]);

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [expenseDate, setExpenseDate] = useState(
    monthParam || new Date().toISOString().slice(0, 7)
  );
  const [newCategory, setNewCategory] = useState("");

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

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const { data: categoriesData, refetch: refetchCategories } = useQuery<CategoriesData>(GET_CATEGORIES);

  const { data: templateGroupsData } = useQuery<ExpenseTemplateGroupsData>(GET_EXPENSE_TEMPLATE_GROUPS);

  const { data: expensesData } = useQuery<ExpensesData>(GET_EXPENSES);

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
    if (expensesData && !monthParam && !hasAutoSelected.current) {
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
  }, [expensesData, existingMonths, monthParam]);

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

  const [createExpense, { loading: creating }] = useMutation(CREATE_EXPENSE);

  const [createCategory, { loading: creatingCategory }] = useMutation(
    CREATE_CATEGORY,
    {
      onCompleted: () => {
        toast.success("Kategori berhasil ditambahkan");
        setIsCategoryOpen(false);
        setNewCategory("");
        refetchCategories();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const categories: Category[] = categoriesData?.categories || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Filter out empty items
    const validItems = items.filter(
      (item) => item.categoryId && item.itemName && item.unitPrice
    );

    if (validItems.length === 0) {
      toast.error("Mohon tambahkan minimal satu pengeluaran");
      return;
    }

    try {
      // Create all expenses in parallel
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
                expenseDate: expenseDate ? toRFC3339(expenseDate) : null,
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

  if (id !== "new") return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Tambah Pengeluaran</h1>
            <p className="text-muted-foreground hidden sm:block">
              Rencanakan pengeluaran bulanan kamu
            </p>
          </div>
        </div>
      </div>

      {/* Archive Input - Date */}
      <div className="flex justify-end sm:justify-start">
          <MonthPicker
              value={expenseDate}
              onChange={setExpenseDate}
              disabledMonths={existingMonths}
              className="max-w-xs m-0"
            />
            {existingMonths.has(expenseDate) && (
              <p className="text-sm text-destructive">
                Bulan ini sudah memiliki data. Silakan pilih bulan lain atau update data yang sudah ada.
              </p>
            )}
      </div>

      {/* Editable Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Detail Pengeluaran</CardTitle>
          {templateGroups.length > 0 && (
            <Select onValueChange={handleSelectTemplateGroup}>
              <SelectTrigger>
                <FileText className="h-4 w-4 mr-2 text-expense" />
                <SelectValue placeholder="Template" />
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
        <CardContent className="px-6 overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Kategori</TableHead>
                <TableHead className="min-w-[150px]">Item</TableHead>
                <TableHead className="min-w-[120px]">Harga</TableHead>
                <TableHead className="min-w-[70px]">Qty</TableHead>
                <TableHead className="min-w-[120px] text-right">Subtotal</TableHead>
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
                          const cat = categories.find(c => c.id === value);
                          setItems(prev => prev.map(i =>
                            i.id === item.id ? { ...i, categoryId: value, categoryName: cat?.name || "" } : i
                          ));
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
                            <DialogTitle>Tambah Kategori Pengeluaran</DialogTitle>
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
                      className="h-9 min-w-[120px]"
                      placeholder="Nama item"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.unitPrice ? formatNumberID(item.unitPrice) : ""}
                      onChange={(e) => {
                        const val = parseNumber(e.target.value);
                        setItems(prev => prev.map(i =>
                          i.id === item.id ? { ...i, unitPrice: val } : i
                        ));
                      }}
                      className="h-9 text-right min-w-[100px]"
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
                      className="h-9 text-center min-w-[60px]"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        value={formatIDR(item.unitPrice * item.quantity)}
                        className="h-9 text-right font-bold text-expense min-w-[120px]"
                        disabled
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
                <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                  <div className="flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Tambah pengeluaran baru</span>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="md:static md:mt-6 p-5 pb-8 md:rounded-lg md:border fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-x border-border bg-card">
        <form onSubmit={handleSubmit}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
              <p className="text-2xl font-bold text-expense">
                {formatIDR(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))}
              </p>
            </div>
            <Button type="submit" className="w-fit" disabled={creating || items.filter(i => i.categoryId && i.itemName && i.unitPrice).length === 0}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan {items.filter(i => i.categoryId && i.itemName && i.unitPrice).length} Pengeluaran
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
