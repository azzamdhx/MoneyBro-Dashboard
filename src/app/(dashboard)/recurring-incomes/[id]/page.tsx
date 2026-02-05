"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { GET_INCOME_CATEGORIES } from "@/lib/graphql/queries";
import {
  CREATE_RECURRING_INCOME,
  UPDATE_RECURRING_INCOME,
  DELETE_RECURRING_INCOME,
  CREATE_INCOME_CATEGORY,
} from "@/lib/graphql/mutations";
import { toast } from "sonner";
import { Loader2, ArrowLeft, FolderPlus, RefreshCw, Plus, Trash2 } from "lucide-react";
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

const GET_RECURRING_INCOME = gql`
  query GetRecurringIncome($id: UUID!) {
    recurringIncome(id: $id) {
      id
      sourceName
      amount
      incomeType
      recurringDay
      isActive
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

interface IncomeCategoriesData {
  incomeCategories: IncomeCategory[];
}

interface RecurringIncomeData {
  recurringIncome: RecurringIncome;
}

interface RecurringIncomeItem {
  id: string;
  categoryId: string;
  categoryName: string;
  sourceName: string;
  amount: number;
  incomeType: string;
  recurringDay: number;
  isActive: boolean;
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

export default function RecurringIncomeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [items, setItems] = useState<RecurringIncomeItem[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [editingRecurring, setEditingRecurring] = useState<RecurringIncome | null>(null);
  
  // For edit mode only
  const [formData, setFormData] = useState({
    categoryId: "",
    sourceName: "",
    amount: "",
    incomeType: "SALARY",
    recurringDay: "1",
    isActive: true,
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
    
    const newItem: RecurringIncomeItem = {
      id: Date.now().toString(),
      categoryId: "",
      categoryName: "",
      sourceName: "",
      amount: 0,
      incomeType: "SALARY",
      recurringDay: 1,
      isActive: true,
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

  const { data: recurringData, loading: loadingRecurring } = useQuery<RecurringIncomeData>(
    GET_RECURRING_INCOME,
    {
      variables: { id },
      skip: isNew,
    }
  );

  const recurring = recurringData?.recurringIncome;
  useEffect(() => {
    if (recurring) {
      setEditingRecurring(recurring);
      setFormData({
        categoryId: recurring.category.id,
        sourceName: recurring.sourceName,
        amount: recurring.amount.toLocaleString("id-ID"),
        incomeType: recurring.incomeType,
        recurringDay: recurring.recurringDay.toString(),
        isActive: recurring.isActive,
        notes: recurring.notes || "",
      });
    }
  }, [recurring]);

  const [createRecurring, { loading: creating }] = useMutation(CREATE_RECURRING_INCOME, {
    onCompleted: () => {
      toast.success("Income tetap berhasil ditambahkan");
      router.push("/recurring-incomes");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { refetch: refetchRecurring } = useQuery<RecurringIncomeData>(
    GET_RECURRING_INCOME,
    {
      variables: { id },
      skip: isNew,
    }
  );

  const [updateRecurring, { loading: updating }] = useMutation(UPDATE_RECURRING_INCOME, {
    onCompleted: () => {
      toast.success("Perubahan disimpan");
      setIsSaving(false);
      setEditingField(null);
      refetchRecurring();
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSaving(false);
    },
  });

  const [deleteRecurring, { loading: deleting }] = useMutation(DELETE_RECURRING_INCOME, {
    onCompleted: () => {
      toast.success("Income tetap berhasil dihapus");
      router.push("/recurring-incomes");
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
        toast.error("Mohon tambahkan minimal satu pemasukkan tetap");
        return;
      }

      // Validate recurring days
      for (const item of validItems) {
        if (item.recurringDay < 1 || item.recurringDay > 31) {
          toast.error("Tanggal income tetap harus antara 1-31");
          return;
        }
      }

      // Create all recurring incomes
      for (const item of validItems) {
        const input = {
          categoryId: item.categoryId,
          sourceName: item.sourceName,
          amount: item.amount,
          incomeType: item.incomeType,
          recurringDay: item.recurringDay,
          notes: item.notes || null,
        };
        await createRecurring({ variables: { input } });
      }
    } else {
      // Edit mode - use formData
      if (!formData.categoryId || !formData.sourceName || !formData.amount) {
        toast.error("Mohon lengkapi kategori, sumber, dan jumlah");
        return;
      }

      const recurringDay = parseInt(formData.recurringDay);
      if (recurringDay < 1 || recurringDay > 31) {
        toast.error("Tanggal income tetap harus antara 1-31");
        return;
      }

      const input = {
        categoryId: formData.categoryId,
        sourceName: formData.sourceName,
        amount: parseNumber(formData.amount),
        incomeType: formData.incomeType,
        recurringDay: recurringDay,
        notes: formData.notes || null,
      };

      updateRecurring({ 
        variables: { 
          id, 
          input: {
            ...input,
            isActive: formData.isActive,
          }
        } 
      });
    }
  };

  const handleDelete = () => {
    deleteRecurring({ variables: { id } });
  };

  // Inline editing handlers
  const startEditing = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const saveInlineEdit = async (field: string) => {
    if (!editingRecurring) return;
    
    let newValue: string | number = editValue;
    
    if (field === "amount") {
      newValue = parseInt(editValue.replace(/\D/g, "")) || 0;
      if (newValue <= 0) {
        setEditingField(null);
        return;
      }
    }
    
    if (field === "recurringDay") {
      newValue = parseInt(editValue) || 1;
      if (newValue < 1 || newValue > 31) {
        toast.error("Tanggal harus antara 1-31");
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
      categoryId: editingRecurring.category.id,
      isActive: editingRecurring.isActive,
    };
    
    if (field === "sourceName") {
      input.sourceName = editValue.trim();
    } else if (field === "amount") {
      input.amount = newValue;
    } else if (field === "recurringDay") {
      input.recurringDay = newValue;
    }
    
    await updateRecurring({ variables: { id, input } });
  };

  const handleInlineCategoryChange = async (categoryId: string) => {
    if (!editingRecurring || categoryId === editingRecurring.category.id) return;
    
    setIsSaving(true);
    await updateRecurring({
      variables: {
        id,
        input: { 
          categoryId,
          isActive: editingRecurring.isActive,
        },
      },
    });
  };

  const handleInlineTypeChange = async (incomeType: string) => {
    if (!editingRecurring || incomeType === editingRecurring.incomeType) return;
    
    setIsSaving(true);
    await updateRecurring({
      variables: {
        id,
        input: { 
          categoryId: editingRecurring.category.id,
          incomeType,
          isActive: editingRecurring.isActive,
        },
      },
    });
  };

  const handleInlineActiveChange = async (isActive: boolean) => {
    if (!editingRecurring) return;
    
    setIsSaving(true);
    await updateRecurring({
      variables: {
        id,
        input: { 
          categoryId: editingRecurring.category.id,
          isActive,
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

  if (!isNew && loadingRecurring) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-10 w-10 rounded-lg bg-income/10 flex items-center justify-center shrink-0">
            <RefreshCw className="h-5 w-5 text-income" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold truncate">
              {isNew ? "Tambah Pemasukkan Tetap" : "Edit Pemasukkan Tetap"}
            </h1>
            <p className="text-muted-foreground text-sm truncate">
              {isNew ? "Buat pemasukan berulang baru" : "Ubah detail pemasukkan tetap"}
            </p>
          </div>
        </div>
        {!isNew && (
          <DeleteConfirmDialog
            title="Hapus Pemasukkan Tetap"
            description="Apakah kamu yakin ingin menghapus pemasukkan tetap ini?"
            onConfirm={handleDelete}
            loading={deleting}
          />
        )}
      </div>

      {/* Edit Mode - Inline Editing */}
      {!isNew && editingRecurring && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Detail Pemasukkan Tetap
              {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Kategori</Label>
                  <Select
                    value={editingRecurring.category.id}
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
                    value={editingRecurring.incomeType}
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
                      onClick={() => startEditing("sourceName", editingRecurring.sourceName)}
                    >
                      {editingRecurring.sourceName}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Tanggal (1-31)</Label>
                  {editingField === "recurringDay" ? (
                    <Input
                      ref={inputRef}
                      type="number"
                      min="1"
                      max="31"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveInlineEdit("recurringDay")}
                      onKeyDown={(e) => handleKeyDown(e, "recurringDay")}
                      disabled={isSaving}
                    />
                  ) : (
                    <div
                      className="h-10 px-3 flex items-center border rounded-md cursor-pointer hover:bg-muted/50 font-medium"
                      onClick={() => startEditing("recurringDay", editingRecurring.recurringDay.toString())}
                    >
                      Tanggal {editingRecurring.recurringDay}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Jumlah per Bulan</Label>
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
                      onClick={() => startEditing("amount", editingRecurring.amount.toString())}
                    >
                      {formatIDR(editingRecurring.amount)}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <div className="flex items-center justify-between h-10 px-3 border rounded-md">
                    <span className={editingRecurring.isActive ? "text-income" : "text-muted-foreground"}>
                      {editingRecurring.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                    <Switch
                      checked={editingRecurring.isActive}
                      onCheckedChange={handleInlineActiveChange}
                      disabled={isSaving}
                    />
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
        <>
          <Card>
            <CardHeader>
              <CardTitle>Detail Pemasukkan Tetap</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[750px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Kategori</TableHead>
                    <TableHead className="min-w-[150px]">Sumber</TableHead>
                    <TableHead className="min-w-[100px]">Tipe</TableHead>
                    <TableHead className="min-w-[70px]">Tgl</TableHead>
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
                          <SelectTrigger className="h-9 min-w-[90px]">
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
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          value={item.recurringDay}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((i) =>
                                i.id === item.id ? { ...i, recurringDay: parseInt(e.target.value) || 1 } : i
                              )
                            )
                          }
                          className="h-9 text-center min-w-[60px]"
                          placeholder="1-31"
                        />
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
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Plus className="h-4 w-4" />
                        <span>Tambah pemasukkan tetap baru</span>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit}>
                <Button type="submit" className="w-fit" disabled={isLoading || items.filter(i => i.categoryId && i.sourceName && i.amount).length === 0}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Simpan {items.filter(i => i.categoryId && i.sourceName && i.amount).length} Pemasukkan Tetap
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
