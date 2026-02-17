"use client";

import { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatIDR } from "@/lib/utils/currency";
import { formatNumberID } from "@/lib/utils/format";
import { GET_INCOME_CATEGORIES } from "@/lib/graphql/queries";
import { CREATE_INCOME_CATEGORY } from "@/lib/graphql/mutations";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface IncomeCategory {
  id: string;
  name: string;
}

interface IncomeCategoriesData {
  incomeCategories: IncomeCategory[];
}

interface Item {
  id: string;
  sourceName: string;
  amount: number;
  incomeType: string;
  category: IncomeCategory;
}

export interface EditableIncomeTableRef {
  addItem: (item: { sourceName: string; categoryId: string; amount: number; incomeType: string }) => void;
}

interface EditableIncomeTableProps {
  items: Item[];
  onCreateItem: (input: { sourceName: string; categoryId: string; amount: number; incomeType: string }) => Promise<void>;
  onUpdateItem: (id: string, input: Record<string, unknown>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onSaveComplete?: () => void;
}

interface EditingCell {
  id: string;
  field: string;
}

interface NewIncomeRow {
  sourceName: string;
  categoryId: string;
  amount: string;
  incomeType: string;
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

const initialNewRow: NewIncomeRow = {
  sourceName: "",
  categoryId: "",
  amount: "",
  incomeType: "OTHER",
};

export const EditableIncomeTable = forwardRef<EditableIncomeTableRef, EditableIncomeTableProps>(function EditableIncomeTable({ items, onCreateItem, onUpdateItem, onDeleteItem, onSaveComplete }, ref) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [newRow, setNewRow] = useState<NewIncomeRow>(initialNewRow);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  // Buffered create/edit/delete state
  const [pendingCreates, setPendingCreates] = useState<Map<string, { sourceName: string; categoryId: string; amount: number; incomeType: string }>>(new Map());
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, Record<string, unknown>>>(new Map());
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const hasPendingChanges = pendingCreates.size > 0 || pendingUpdates.size > 0 || pendingDeletes.size > 0;

  useImperativeHandle(ref, () => ({
    addItem: (item) => {
      const tempId = `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setPendingCreates(prev => {
        const next = new Map(prev);
        next.set(tempId, item);
        return next;
      });
    },
  }));

  const { data: categoriesData, refetch: refetchCategories } = useQuery<IncomeCategoriesData>(GET_INCOME_CATEGORIES);
  const categories: IncomeCategory[] = useMemo(() => categoriesData?.incomeCategories || [], [categoriesData]);

  // Compute display items with pending changes applied
  const displayItems = useMemo(() => {
    const serverItems = items
      .filter(item => !pendingDeletes.has(item.id))
      .map(item => {
        const pending = pendingUpdates.get(item.id);
        if (!pending) return item;
        const merged = { ...item };
        if (pending.sourceName !== undefined) merged.sourceName = pending.sourceName as string;
        if (pending.amount !== undefined) merged.amount = pending.amount as number;
        if (pending.incomeType !== undefined) merged.incomeType = pending.incomeType as string;
        if (pending.categoryId !== undefined) {
          const cat = categories.find(c => c.id === pending.categoryId);
          if (cat) merged.category = cat;
        }
        return merged;
      });

    const newItems: Item[] = Array.from(pendingCreates.entries()).map(([id, pc]) => ({
      id,
      sourceName: pc.sourceName,
      amount: pc.amount,
      incomeType: pc.incomeType,
      category: categories.find(c => c.id === pc.categoryId) || { id: pc.categoryId, name: "" },
    }));

    return [...serverItems, ...newItems];
  }, [items, pendingUpdates, pendingDeletes, pendingCreates, categories]);

  const [createCategory, { loading: creatingCategory }] = useMutation(CREATE_INCOME_CATEGORY, {
    onCompleted: () => {
      toast.success("Kategori berhasil ditambahkan");
      setIsCategoryOpen(false);
      setNewCategory("");
      refetchCategories();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const commitNewRow = (): boolean => {
    const amount = parseInt(newRow.amount.replace(/\D/g, "")) || 0;
    if (!newRow.sourceName.trim() || !newRow.categoryId || amount <= 0) return false;
    const tempId = `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setPendingCreates(prev => {
      const next = new Map(prev);
      next.set(tempId, {
        sourceName: newRow.sourceName.trim(),
        categoryId: newRow.categoryId,
        amount,
        incomeType: newRow.incomeType,
      });
      return next;
    });
    setNewRow(initialNewRow);
    setIsAddingNew(false);
    return true;
  };

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const startEditing = (item: Item, field: string) => {
    let value = "";
    switch (field) {
      case "sourceName":
        value = item.sourceName;
        break;
      case "amount":
        value = item.amount.toString();
        break;
    }
    setEditingCell({ id: item.id, field });
    setEditValue(value);
  };

  const saveEdit = (item: Item) => {
    if (!editingCell) return;

    const { field } = editingCell;
    let newValue: string | number = editValue;

    if (field === "amount") {
      newValue = parseInt(editValue.replace(/\D/g, "")) || 0;
      if (newValue <= 0) {
        setEditingCell(null);
        return;
      }
    }

    if (field === "sourceName" && !editValue.trim()) {
      setEditingCell(null);
      return;
    }

    const currentValue = item[field as keyof Item];
    if (currentValue === newValue) {
      setEditingCell(null);
      return;
    }

    setEditingCell(null);

    if (pendingCreates.has(item.id)) {
      setPendingCreates(prev => {
        const next = new Map(prev);
        const existing = next.get(item.id)!;
        if (field === "sourceName") existing.sourceName = editValue.trim();
        else if (field === "amount") existing.amount = newValue as number;
        next.set(item.id, existing);
        return next;
      });
    } else {
      setPendingUpdates(prev => {
        const next = new Map(prev);
        const existing = next.get(item.id) || { categoryId: item.category.id };
        if (field === "sourceName") existing.sourceName = editValue.trim();
        else if (field === "amount") existing.amount = newValue;
        next.set(item.id, existing);
        return next;
      });
    }
  };

  const handleCategoryChange = (item: Item, categoryId: string) => {
    if (categoryId === item.category.id) return;

    if (pendingCreates.has(item.id)) {
      setPendingCreates(prev => {
        const next = new Map(prev);
        const existing = next.get(item.id)!;
        existing.categoryId = categoryId;
        next.set(item.id, existing);
        return next;
      });
    } else {
      setPendingUpdates(prev => {
        const next = new Map(prev);
        const existing = next.get(item.id) || {};
        existing.categoryId = categoryId;
        next.set(item.id, existing);
        return next;
      });
    }
  };

  const handleTypeChange = (item: Item, incomeType: string) => {
    if (incomeType === item.incomeType) return;

    if (pendingCreates.has(item.id)) {
      setPendingCreates(prev => {
        const next = new Map(prev);
        const existing = next.get(item.id)!;
        existing.incomeType = incomeType;
        next.set(item.id, existing);
        return next;
      });
    } else {
      setPendingUpdates(prev => {
        const next = new Map(prev);
        const existing = next.get(item.id) || { categoryId: item.category.id };
        existing.incomeType = incomeType;
        next.set(item.id, existing);
        return next;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, item: Item) => {
    if (e.key === "Enter") {
      saveEdit(item);
    } else if (e.key === "Escape") {
      setEditingCell(null);
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

  const handleDelete = (id: string) => {
    if (pendingCreates.has(id)) {
      setPendingCreates(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    } else {
      setPendingDeletes(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      setPendingUpdates(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleSave = async () => {
    if (isAddingNew) {
      const committed = commitNewRow();
      if (!committed) {
        toast.error("Lengkapi item sebelumnya terlebih dahulu");
        return;
      }
    }
    setSaving(true);
    try {
      await Promise.all(
        Array.from(pendingCreates.values()).map(input => onCreateItem(input))
      );
      await Promise.all(
        Array.from(pendingUpdates.entries()).map(([id, input]) => onUpdateItem(id, input))
      );
      await Promise.all(
        Array.from(pendingDeletes).map(id => onDeleteItem(id))
      );
      setPendingCreates(new Map());
      setPendingUpdates(new Map());
      setPendingDeletes(new Set());
      toast.success("Perubahan berhasil disimpan");
      onSaveComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setPendingCreates(new Map());
    setPendingUpdates(new Map());
    setPendingDeletes(new Set());
    setNewRow(initialNewRow);
    setIsAddingNew(false);
  };

  const renderEditableCell = (item: Item, field: string, displayValue: string) => {
    const isEditing = editingCell?.id === item.id && editingCell?.field === field;
    const isPending = pendingUpdates.has(item.id) || pendingCreates.has(item.id);

    if (isEditing) {
      const isNumeric = field === "amount";
      return (
        <Input
          ref={inputRef}
          autoFocus
          value={isNumeric ? formatNumberID(parseInt(editValue.replace(/\D/g, "")) || 0) : editValue}
          onChange={(e) => {
            if (isNumeric) {
              const raw = e.target.value.replace(/\D/g, "");
              setEditValue(raw);
            } else {
              setEditValue(e.target.value);
            }
          }}
          onBlur={() => {
            if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = setTimeout(() => {
              if (document.activeElement === inputRef.current) return;
              saveEdit(item);
            }, 0);
          }}
          onKeyDown={(e) => handleKeyDown(e, item)}
          className="h-8 w-full min-w-[80px]"
        />
      );
    }

    return (
      <div
        className={`cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -mx-2 ${isPending ? "text-primary" : ""}`}
        onClick={() => startEditing(item, field)}
      >
        {displayValue}
      </div>
    );
  };

  return (
    <>
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">Sumber</TableHead>
            <TableHead className="min-w-[120px]">Kategori</TableHead>
            <TableHead className="min-w-[100px]">Tipe</TableHead>
            <TableHead className="text-right min-w-[120px]">Jumlah</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {renderEditableCell(item, "sourceName", item.sourceName)}
              </TableCell>
              <TableCell>
                <Select
                  value={item.category.id}
                  onValueChange={(value) => handleCategoryChange(item, value)}
                >
                  <SelectTrigger className="h-8 w-full">
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
              </TableCell>
              <TableCell>
                <Select
                  value={item.incomeType}
                  onValueChange={(value) => handleTypeChange(item, value)}
                >
                  <SelectTrigger className="h-8 w-full">
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
              <TableCell className="text-right text-income font-medium">
                {renderEditableCell(item, "amount", formatIDR(item.amount))}
              </TableCell>
              <TableCell>
                <DeleteConfirmDialog
                  title="Hapus Pemasukan"
                  description={`Hapus "${item.sourceName}"?`}
                  onConfirm={() => handleDelete(item.id)}
                  variant="icon"
                />
              </TableCell>
            </TableRow>
          ))}

          {/* Add New Row */}
          {isAddingNew && (
            <TableRow>
              <TableCell>
                <Input
                  placeholder="Nama sumber"
                  value={newRow.sourceName}
                  onChange={(e) => setNewRow({ ...newRow, sourceName: e.target.value })}
                  className="h-8"
                  autoFocus
                />
              </TableCell>
              <TableCell>
                <Select
                  value={newRow.categoryId || undefined}
                  onValueChange={(value) => {
                    if (value === "__create__") {
                      setIsCategoryOpen(true);
                      return;
                    }
                    setNewRow({ ...newRow, categoryId: value });
                  }}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder={categories.length === 0 ? "+ Buat kategori" : "Kategori"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__create__" className="text-primary font-medium">
                      <span className="flex items-center gap-2">
                        <Plus className="h-3 w-3" />
                        Buat kategori
                      </span>
                    </SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select
                  value={newRow.incomeType}
                  onValueChange={(value) => setNewRow({ ...newRow, incomeType: value })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Tipe" />
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
                  placeholder="Jumlah"
                  value={newRow.amount ? formatNumberID(parseInt(newRow.amount)) : ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setNewRow({ ...newRow, amount: value });
                  }}
                  className="h-8 text-right"
                />
              </TableCell>
              <TableCell>
                  <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewRow(initialNewRow);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          )}

          {/* Always visible add button */}
          <TableRow
            className="cursor-pointer hover:bg-muted/30"
            onClick={() => {
              if (isAddingNew) {
                const committed = commitNewRow();
                if (!committed) {
                  toast.error("Lengkapi item sebelumnya terlebih dahulu");
                  return;
                }
              }
              setIsAddingNew(true);
            }}
          >
            <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
              <div className="flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                <span>Tambah pemasukan baru</span>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <div className="md:static md:mt-4 md:border-0 md:bg-transparent md:p-0 p-6 pb-8 fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-x border-border bg-card">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-income">
            {formatIDR(displayItems.reduce((sum, item) => sum + item.amount, 0))}
          </p>
        </div>
        <div className="flex gap-2">
          {hasPendingChanges && (
            <Button variant="outline" onClick={handleDiscardChanges} disabled={saving} className="hidden sm:block">
              Batal
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || !hasPendingChanges}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Simpan Perubahan
          </Button>
        </div>
      </div>
    </div>
    <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat Kategori Baru</DialogTitle>
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
    </>
  );
});
