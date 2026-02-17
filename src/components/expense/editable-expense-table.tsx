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
import { GET_CATEGORIES } from "@/lib/graphql/queries";
import { CREATE_CATEGORY } from "@/lib/graphql/mutations";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface Category {
  id: string;
  name: string;
}

interface CategoriesData {
  categories: Category[];
}

interface Item {
  id: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  total: number;
  category: Category;
}

export interface EditableExpenseTableRef {
  addItem: (item: { itemName: string; categoryId: string; unitPrice: number; quantity: number }) => void;
}

interface EditableExpenseTableProps {
  items: Item[];
  onCreateItem: (input: { itemName: string; categoryId: string; unitPrice: number; quantity: number }) => Promise<void>;
  onUpdateItem: (id: string, input: Record<string, unknown>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onSaveComplete?: () => void;
}

interface EditingCell {
  id: string;
  field: string;
}

interface NewExpenseRow {
  itemName: string;
  categoryId: string;
  unitPrice: string;
  quantity: string;
}

const initialNewRow: NewExpenseRow = {
  itemName: "",
  categoryId: "",
  unitPrice: "",
  quantity: "1",
};

export const EditableExpenseTable = forwardRef<EditableExpenseTableRef, EditableExpenseTableProps>(function EditableExpenseTable({ items, onCreateItem, onUpdateItem, onDeleteItem, onSaveComplete }, ref) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [newRow, setNewRow] = useState<NewExpenseRow>(initialNewRow);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Buffered create/edit/delete state
  const [pendingCreates, setPendingCreates] = useState<Map<string, { itemName: string; categoryId: string; unitPrice: number; quantity: number }>>(new Map());
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

  const { data: categoriesData, refetch: refetchCategories } = useQuery<CategoriesData>(GET_CATEGORIES);
  const categories: Category[] = useMemo(() => categoriesData?.categories || [], [categoriesData]);

  // Compute display items with pending changes applied
  const displayItems = useMemo(() => {
    const serverItems = items
      .filter(item => !pendingDeletes.has(item.id))
      .map(item => {
        const pending = pendingUpdates.get(item.id);
        if (!pending) return item;
        const merged = { ...item };
        if (pending.itemName !== undefined) merged.itemName = pending.itemName as string;
        if (pending.unitPrice !== undefined) merged.unitPrice = pending.unitPrice as number;
        if (pending.quantity !== undefined) merged.quantity = pending.quantity as number;
        if (pending.categoryId !== undefined) {
          const cat = categories.find(c => c.id === pending.categoryId);
          if (cat) merged.category = cat;
        }
        merged.total = merged.unitPrice * merged.quantity;
        return merged;
      });

    const newItems: Item[] = Array.from(pendingCreates.entries()).map(([id, pc]) => ({
      id,
      itemName: pc.itemName,
      unitPrice: pc.unitPrice,
      quantity: pc.quantity,
      total: pc.unitPrice * pc.quantity,
      category: categories.find(c => c.id === pc.categoryId) || { id: pc.categoryId, name: "" },
    }));

    return [...serverItems, ...newItems];
  }, [items, pendingUpdates, pendingDeletes, pendingCreates, categories]);

  const [createCategory, { loading: creatingCategory }] = useMutation(CREATE_CATEGORY, {
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
    const unitPrice = parseInt(newRow.unitPrice.replace(/\D/g, "")) || 0;
    const quantity = parseInt(newRow.quantity) || 1;
    if (!newRow.itemName.trim() || !newRow.categoryId || unitPrice <= 0) return false;
    const tempId = `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setPendingCreates(prev => {
      const next = new Map(prev);
      next.set(tempId, {
        itemName: newRow.itemName.trim(),
        categoryId: newRow.categoryId,
        unitPrice,
        quantity,
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
      case "itemName":
        value = item.itemName;
        break;
      case "unitPrice":
        value = item.unitPrice.toString();
        break;
      case "quantity":
        value = item.quantity.toString();
        break;
    }
    setEditingCell({ id: item.id, field });
    setEditValue(value);
  };

  const saveEdit = (item: Item) => {
    if (!editingCell) return;

    const { field } = editingCell;
    let newValue: string | number = editValue;

    if (field === "unitPrice" || field === "quantity") {
      newValue = parseInt(editValue.replace(/\D/g, "")) || 0;
      if (newValue <= 0) {
        setEditingCell(null);
        return;
      }
    }

    if (field === "itemName" && !editValue.trim()) {
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
        if (field === "itemName") existing.itemName = editValue.trim();
        else if (field === "unitPrice") existing.unitPrice = newValue as number;
        else if (field === "quantity") existing.quantity = newValue as number;
        next.set(item.id, existing);
        return next;
      });
    } else {
      setPendingUpdates(prev => {
        const next = new Map(prev);
        const existing = next.get(item.id) || { categoryId: item.category.id };
        if (field === "itemName") existing.itemName = editValue.trim();
        else if (field === "unitPrice") existing.unitPrice = newValue;
        else if (field === "quantity") existing.quantity = newValue;
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
      const isNumeric = field === "unitPrice" || field === "quantity";
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
            <TableHead className="min-w-[150px]">Item</TableHead>
            <TableHead className="min-w-[120px]">Kategori</TableHead>
            <TableHead className="text-right min-w-[100px]">Harga</TableHead>
            <TableHead className="text-right min-w-[60px]">Qty</TableHead>
            <TableHead className="text-right min-w-[100px]">Total</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {renderEditableCell(item, "itemName", item.itemName)}
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
              <TableCell className="text-right">
                {renderEditableCell(item, "unitPrice", formatIDR(item.unitPrice))}
              </TableCell>
              <TableCell className="text-right">
                {renderEditableCell(item, "quantity", item.quantity.toString())}
              </TableCell>
              <TableCell className="text-right font-medium text-expense">
                {formatIDR(item.total)}
              </TableCell>
              <TableCell>
                <DeleteConfirmDialog
                  title="Hapus Item"
                  description={`Hapus "${item.itemName}"?`}
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
                  placeholder="Nama item"
                  value={newRow.itemName}
                  onChange={(e) => setNewRow({ ...newRow, itemName: e.target.value })}
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
                        <Plus className="h-3 w-3 text-primary" />
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
                <Input
                  placeholder="Harga"
                  value={newRow.unitPrice ? formatNumberID(parseInt(newRow.unitPrice)) : ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setNewRow({ ...newRow, unitPrice: value });
                  }}
                  className="h-8 text-right"
                />
              </TableCell>
              <TableCell>
                <Input
                  placeholder="Qty"
                  value={newRow.quantity}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setNewRow({ ...newRow, quantity: value || "1" });
                  }}
                  className="h-8 text-right w-16"
                />
              </TableCell>
              <TableCell className="text-right font-medium text-expense">
                {formatIDR((parseInt(newRow.unitPrice) || 0) * (parseInt(newRow.quantity) || 1))}
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
            <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
              <div className="flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                <span>Tambah item baru</span>
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
          <p className="text-2xl font-bold text-expense">
            {formatIDR(displayItems.reduce((sum, item) => sum + item.total, 0))}
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
    </>
  );
});
