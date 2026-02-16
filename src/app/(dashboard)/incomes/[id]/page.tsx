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
import { GET_INCOME_CATEGORIES, GET_RECURRING_INCOMES, GET_INCOMES } from "@/lib/graphql/queries";
import {
  CREATE_INCOME,
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
import { formatNumberID, toRFC3339 } from "@/lib/utils/format";

interface IncomeCategory {
  id: string;
  name: string;
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

interface IncomesData {
  incomes: {
    items: {
      id: string;
      incomeDate: string | null;
    }[];
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

export default function CreateIncomePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const monthParam = searchParams.get("month");

  // Redirect if not creating new — editing is handled in month/[monthKey]/page.tsx
  useEffect(() => {
    if (id !== "new") {
      router.replace("/incomes");
    }
  }, [id, router]);

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [items, setItems] = useState<IncomeItem[]>([]);
  const [incomeDate, setIncomeDate] = useState(
    monthParam || new Date().toISOString().slice(0, 7)
  );
  const [newCategory, setNewCategory] = useState("");

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

  const { data: categoriesData, refetch: refetchCategories } =
    useQuery<IncomeCategoriesData>(GET_INCOME_CATEGORIES);

  const { data: recurringData } = useQuery<RecurringIncomesData>(GET_RECURRING_INCOMES, {
    variables: { isActive: true },
  });

  const { data: incomesData } = useQuery<IncomesData>(GET_INCOMES);

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
    if (incomesData && !monthParam && !hasAutoSelected.current) {
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
  }, [incomesData, existingMonths, monthParam]);

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

  const [createIncome, { loading: creating }] = useMutation(CREATE_INCOME);

  const [createCategory, { loading: creatingCategory }] = useMutation(
    CREATE_INCOME_CATEGORY,
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

  const categories: IncomeCategory[] = categoriesData?.incomeCategories || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
                incomeDate: incomeDate ? toRFC3339(incomeDate) : null,
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
            <h1 className="text-2xl font-bold">Tambah Pemasukan</h1>
            <p className="text-muted-foreground hidden sm:block">
              Catat pemasukan baru
            </p>
          </div>
        </div>
      </div>

      {/* Archive Input - Date */}
      <div className="flex justify-end sm:justify-start">
          <MonthPicker
              value={incomeDate}
              onChange={setIncomeDate}
              disabledMonths={existingMonths}
              className="max-w-xs m-0"
            />
            {existingMonths.has(incomeDate) && (
              <p className="text-sm text-destructive">
                Bulan ini sudah memiliki data. Silakan pilih bulan lain atau update data yang sudah ada.
              </p>
            )}
      </div>

      {/* Editable Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Detail Pemasukan</CardTitle>
          {recurringIncomes.length > 0 && (
            <Select onValueChange={handleSelectRecurring}>
              <SelectTrigger>
                <RefreshCw className="h-4 w-4 mr-2 text-income" />
                <SelectValue placeholder="Tetap" />
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
        <CardContent className="px-6 overflow-x-auto">
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
                        value={item.amount ? formatNumberID(item.amount) : ""}
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

      <div className="md:static md:mt-6 p-5 pb-8 md:rounded-lg md:border fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-x border-border bg-card">
        <form onSubmit={handleSubmit}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Pemasukan</p>
              <p className="text-2xl font-bold text-income">
                {formatIDR(items.reduce((sum, item) => sum + item.amount, 0))}
              </p>
            </div>
            <Button type="submit" className="w-fit" disabled={creating || items.filter(i => i.categoryId && i.sourceName && i.amount).length === 0}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan {items.filter(i => i.categoryId && i.sourceName && i.amount).length} Pemasukan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
