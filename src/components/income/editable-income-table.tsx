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
import { GET_INCOME_CATEGORIES } from "@/lib/graphql/queries";
import { CREATE_INCOME, UPDATE_INCOME, DELETE_INCOME } from "@/lib/graphql/mutations";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Check } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface IncomeCategory {
  id: string;
  name: string;
}

interface IncomeCategoriesData {
  incomeCategories: IncomeCategory[];
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

interface EditableIncomeTableProps {
  incomes: Income[];
  monthKey: string;
  onRefetch: () => void;
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

export function EditableIncomeTable({ incomes, monthKey, onRefetch }: EditableIncomeTableProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [newRow, setNewRow] = useState<NewIncomeRow>(initialNewRow);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: categoriesData } = useQuery<IncomeCategoriesData>(GET_INCOME_CATEGORIES);
  const categories: IncomeCategory[] = categoriesData?.incomeCategories || [];

  const [createIncome, { loading: creating }] = useMutation(CREATE_INCOME, {
    onCompleted: () => {
      toast.success("Pemasukan berhasil ditambahkan");
      setNewRow(initialNewRow);
      setIsAddingNew(false);
      onRefetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [updateIncome] = useMutation(UPDATE_INCOME, {
    onCompleted: () => {
      toast.success("Pemasukan berhasil diperbarui");
      setSavingId(null);
      onRefetch();
    },
    onError: (error) => {
      toast.error(error.message);
      setSavingId(null);
    },
  });

  const [deleteIncome] = useMutation(DELETE_INCOME, {
    onCompleted: () => {
      toast.success("Pemasukan berhasil dihapus");
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

  const startEditing = (income: Income, field: string) => {
    let value = "";
    switch (field) {
      case "sourceName":
        value = income.sourceName;
        break;
      case "amount":
        value = income.amount.toString();
        break;
    }
    setEditingCell({ id: income.id, field });
    setEditValue(value);
  };

  const saveEdit = async (income: Income) => {
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

    const currentValue = income[field as keyof Income];
    if (currentValue === newValue) {
      setEditingCell(null);
      return;
    }

    setSavingId(income.id);
    setEditingCell(null);

    const input: Record<string, unknown> = {
      categoryId: income.category.id,
    };

    if (field === "sourceName") {
      input.sourceName = editValue.trim();
    } else if (field === "amount") {
      input.amount = newValue;
    }

    await updateIncome({
      variables: {
        id: income.id,
        input,
      },
    });
  };

  const handleCategoryChange = async (income: Income, categoryId: string) => {
    if (categoryId === income.category.id) return;

    setSavingId(income.id);
    await updateIncome({
      variables: {
        id: income.id,
        input: {
          categoryId,
        },
      },
    });
  };

  const handleTypeChange = async (income: Income, incomeType: string) => {
    if (incomeType === income.incomeType) return;

    setSavingId(income.id);
    await updateIncome({
      variables: {
        id: income.id,
        input: {
          categoryId: income.category.id,
          incomeType,
        },
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, income: Income) => {
    if (e.key === "Enter") {
      saveEdit(income);
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const handleAddNew = async () => {
    if (!newRow.sourceName.trim() || !newRow.categoryId) {
      toast.error("Nama sumber dan kategori wajib diisi");
      return;
    }

    const amount = parseInt(newRow.amount.replace(/\D/g, "")) || 0;

    if (amount <= 0) {
      toast.error("Jumlah harus lebih dari 0");
      return;
    }

    await createIncome({
      variables: {
        input: {
          sourceName: newRow.sourceName.trim(),
          categoryId: newRow.categoryId,
          amount,
          incomeType: newRow.incomeType,
          incomeDate: toRFC3339(monthKey),
        },
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteIncome({ variables: { id } });
  };

  const renderEditableCell = (income: Income, field: string, displayValue: string) => {
    const isEditing = editingCell?.id === income.id && editingCell?.field === field;
    const isSaving = savingId === income.id;

    if (isEditing) {
      return (
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveEdit(income)}
          onKeyDown={(e) => handleKeyDown(e, income)}
          className="h-8 w-full min-w-[80px]"
        />
      );
    }

    return (
      <div
        className={`cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -mx-2 ${isSaving ? "opacity-50" : ""}`}
        onClick={() => !isSaving && startEditing(income, field)}
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
            <TableHead className="min-w-[150px]">Sumber</TableHead>
            <TableHead className="min-w-[120px]">Kategori</TableHead>
            <TableHead className="min-w-[100px]">Tipe</TableHead>
            <TableHead className="text-right min-w-[120px]">Jumlah</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incomes.map((income) => (
            <TableRow key={income.id}>
              <TableCell className="font-medium">
                {renderEditableCell(income, "sourceName", income.sourceName)}
              </TableCell>
              <TableCell>
                <Select
                  value={income.category.id}
                  onValueChange={(value) => handleCategoryChange(income, value)}
                  disabled={savingId === income.id}
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
                  value={income.incomeType}
                  onValueChange={(value) => handleTypeChange(income, value)}
                  disabled={savingId === income.id}
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
              <TableCell className="text-right">
                {renderEditableCell(income, "amount", formatIDR(income.amount))}
              </TableCell>
              <TableCell>
                <DeleteConfirmDialog
                  title="Hapus Pemasukan"
                  description={`Hapus "${income.sourceName}"?`}
                  onConfirm={() => handleDelete(income.id)}
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
                  placeholder="Nama sumber"
                  value={newRow.sourceName}
                  onChange={(e) => setNewRow({ ...newRow, sourceName: e.target.value })}
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
              <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                <div className="flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Tambah pemasukan baru</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
