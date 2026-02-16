"use client";

import { useState, useRef, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatIDR } from "@/lib/utils/currency";
import { formatNumberID, toRFC3339 } from "@/lib/utils/format";
import { GET_CATEGORIES } from "@/lib/graphql/queries";
import { CREATE_EXPENSE, UPDATE_EXPENSE, DELETE_EXPENSE } from "@/lib/graphql/mutations";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Check } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface Category {
  id: string;
  name: string;
}

interface CategoriesData {
  categories: Category[];
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

interface EditableExpenseTableProps {
  expenses: Expense[];
  monthKey: string;
  onRefetch: () => void;
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

export function EditableExpenseTable({ expenses, monthKey, onRefetch }: EditableExpenseTableProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [newRow, setNewRow] = useState<NewExpenseRow>(initialNewRow);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: categoriesData } = useQuery<CategoriesData>(GET_CATEGORIES);
  const categories: Category[] = categoriesData?.categories || [];

  const [createExpense, { loading: creating }] = useMutation(CREATE_EXPENSE, {
    onCompleted: () => {
      toast.success("Item berhasil ditambahkan");
      setNewRow(initialNewRow);
      setIsAddingNew(false);
      onRefetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [updateExpense] = useMutation(UPDATE_EXPENSE, {
    onCompleted: () => {
      toast.success("Item berhasil diperbarui");
      setSavingId(null);
      onRefetch();
    },
    onError: (error) => {
      toast.error(error.message);
      setSavingId(null);
    },
  });

  const [deleteExpense] = useMutation(DELETE_EXPENSE, {
    onCompleted: () => {
      toast.success("Item berhasil dihapus");
      onRefetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const startEditing = (expense: Expense, field: string) => {
    let value = "";
    switch (field) {
      case "itemName":
        value = expense.itemName;
        break;
      case "unitPrice":
        value = expense.unitPrice.toString();
        break;
      case "quantity":
        value = expense.quantity.toString();
        break;
    }
    setEditingCell({ id: expense.id, field });
    setEditValue(value);
  };

  const saveEdit = async (expense: Expense) => {
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

    const currentValue = expense[field as keyof Expense];
    if (currentValue === newValue) {
      setEditingCell(null);
      return;
    }

    setSavingId(expense.id);
    setEditingCell(null);

    const input: Record<string, unknown> = {
      categoryId: expense.category.id,
    };

    if (field === "itemName") {
      input.itemName = editValue.trim();
    } else if (field === "unitPrice") {
      input.unitPrice = newValue;
    } else if (field === "quantity") {
      input.quantity = newValue;
    }

    await updateExpense({
      variables: {
        id: expense.id,
        input,
      },
    });
  };

  const handleCategoryChange = async (expense: Expense, categoryId: string) => {
    if (categoryId === expense.category.id) return;

    setSavingId(expense.id);
    await updateExpense({
      variables: {
        id: expense.id,
        input: {
          categoryId,
        },
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, expense: Expense) => {
    if (e.key === "Enter") {
      saveEdit(expense);
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const handleAddNew = async () => {
    if (!newRow.itemName.trim() || !newRow.categoryId) {
      toast.error("Nama item dan kategori wajib diisi");
      return;
    }

    const unitPrice = parseInt(newRow.unitPrice.replace(/\D/g, "")) || 0;
    const quantity = parseInt(newRow.quantity) || 1;

    if (unitPrice <= 0) {
      toast.error("Harga harus lebih dari 0");
      return;
    }

    await createExpense({
      variables: {
        input: {
          itemName: newRow.itemName.trim(),
          categoryId: newRow.categoryId,
          unitPrice,
          quantity,
          expenseDate: toRFC3339(monthKey),
        },
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteExpense({ variables: { id } });
  };

  const renderEditableCell = (expense: Expense, field: string, displayValue: string) => {
    const isEditing = editingCell?.id === expense.id && editingCell?.field === field;
    const isSaving = savingId === expense.id;

    if (isEditing) {
      return (
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveEdit(expense)}
          onKeyDown={(e) => handleKeyDown(e, expense)}
          className="h-8 w-full min-w-[80px]"
        />
      );
    }

    return (
      <div
        className={`cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -mx-2 ${isSaving ? "opacity-50" : ""}`}
        onClick={() => !isSaving && startEditing(expense, field)}
      >
        {displayValue}
        {isSaving && <Loader2 className="inline ml-2 h-3 w-3 animate-spin" />}
      </div>
    );
  };

  return (
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
          {expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell className="font-medium">
                {renderEditableCell(expense, "itemName", expense.itemName)}
              </TableCell>
              <TableCell>
                <Select
                  value={expense.category.id}
                  onValueChange={(value) => handleCategoryChange(expense, value)}
                  disabled={savingId === expense.id}
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
                {renderEditableCell(expense, "unitPrice", formatIDR(expense.unitPrice))}
              </TableCell>
              <TableCell className="text-right">
                {renderEditableCell(expense, "quantity", expense.quantity.toString())}
              </TableCell>
              <TableCell className="text-right font-medium text-expense">
                {formatIDR(expense.total)}
              </TableCell>
              <TableCell>
                <DeleteConfirmDialog
                  title="Hapus Item"
                  description={`Hapus "${expense.itemName}"?`}
                  onConfirm={() => handleDelete(expense.id)}
                  variant="icon"
                />
              </TableCell>
            </TableRow>
          ))}

          {/* Add New Row */}
          {isAddingNew ? (
            <TableRow className="bg-muted/30">
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
                  value={newRow.categoryId}
                  onValueChange={(value) => setNewRow({ ...newRow, categoryId: value })}
                >
                  <SelectTrigger className="h-8">
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
              <TableCell className="text-right font-medium text-muted-foreground">
                {formatIDR((parseInt(newRow.unitPrice) || 0) * (parseInt(newRow.quantity) || 1))}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={handleAddNew}
                    disabled={creating}
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 text-income" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewRow(initialNewRow);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            <TableRow
              className="cursor-pointer hover:bg-muted/30"
              onClick={() => setIsAddingNew(true)}
            >
              <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                <div className="flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Tambah item baru</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
