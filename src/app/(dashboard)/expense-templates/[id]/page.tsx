"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GET_CATEGORIES } from "@/lib/graphql/queries";
import {
  CREATE_EXPENSE_TEMPLATE_GROUP,
  UPDATE_EXPENSE_TEMPLATE_GROUP,
  DELETE_EXPENSE_TEMPLATE_GROUP,
  ADD_EXPENSE_TEMPLATE_ITEM,
  UPDATE_EXPENSE_TEMPLATE_ITEM,
  DELETE_EXPENSE_TEMPLATE_ITEM,
} from "@/lib/graphql/mutations";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { formatIDR } from "@/lib/utils/currency";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { EditableExpenseTable } from "@/components/expense/editable-expense-table";

const GET_EXPENSE_TEMPLATE_GROUP = gql`
  query GetExpenseTemplateGroup($id: UUID!) {
    expenseTemplateGroup(id: $id) {
      id
      name
      recurringDay
      notes
      total
      items {
        id
        itemName
        unitPrice
        quantity
        total
        category {
          id
          name
        }
      }
    }
  }
`;

interface Category {
  id: string;
  name: string;
}

interface ExpenseTemplateItemData {
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
  recurringDay: number | null;
  notes: string | null;
  total: number;
  items: ExpenseTemplateItemData[];
}

interface CategoriesData {
  categories: Category[];
}

interface ExpenseTemplateGroupData {
  expenseTemplateGroup: ExpenseTemplateGroup;
}

interface DraftExpenseItem {
  id: string;
  categoryId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  category: Category;
}

export default function ExpenseTemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [isSaving, setIsSaving] = useState(false);
  
  // Form state for new group
  const [groupName, setGroupName] = useState("");
  const [recurringDay, setRecurringDay] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftExpenseItem[]>([]);
  
  // Inline editing state for edit mode
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const { data: categoriesData } = useQuery<CategoriesData>(GET_CATEGORIES);

  const { data: groupData, loading: loadingGroup, refetch: refetchGroup } = useQuery<ExpenseTemplateGroupData>(
    GET_EXPENSE_TEMPLATE_GROUP,
    {
      variables: { id },
      skip: isNew,
    }
  );

  const group = groupData?.expenseTemplateGroup;

  const [createGroup, { loading: creating }] = useMutation(CREATE_EXPENSE_TEMPLATE_GROUP, {
    onCompleted: () => {
      toast.success("Template berhasil ditambahkan");
      router.push("/expense-templates");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [updateGroup, { loading: updating }] = useMutation(UPDATE_EXPENSE_TEMPLATE_GROUP, {
    onCompleted: () => {
      toast.success("Perubahan disimpan");
      setIsSaving(false);
      setEditingField(null);
      refetchGroup();
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSaving(false);
    },
  });

  const [deleteGroup, { loading: deleting }] = useMutation(DELETE_EXPENSE_TEMPLATE_GROUP, {
    onCompleted: () => {
      toast.success("Template berhasil dihapus");
      router.push("/expense-templates");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [addItem] = useMutation(ADD_EXPENSE_TEMPLATE_ITEM);
  const [updateItem] = useMutation(UPDATE_EXPENSE_TEMPLATE_ITEM);
  const [deleteItem] = useMutation(DELETE_EXPENSE_TEMPLATE_ITEM);

  const categories: Category[] = categoriesData?.categories || [];

  const resolveCategory = (categoryId: string) => categories.find(c => c.id === categoryId) || { id: categoryId, name: "" };

  const handleLocalCreateItem = async (input: { itemName: string; categoryId: string; unitPrice: number; quantity: number }) => {
    const newItem: DraftExpenseItem = {
      id: crypto.randomUUID(),
      itemName: input.itemName,
      unitPrice: input.unitPrice,
      quantity: input.quantity,
      categoryId: input.categoryId,
      category: resolveCategory(input.categoryId),
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleLocalUpdateItem = async (itemId: string, input: Record<string, unknown>) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item;
        const updated: DraftExpenseItem = { ...item };
        if (input.itemName !== undefined) updated.itemName = input.itemName as string;
        if (input.unitPrice !== undefined) updated.unitPrice = input.unitPrice as number;
        if (input.quantity !== undefined) updated.quantity = input.quantity as number;
        if (input.categoryId !== undefined) {
          updated.categoryId = input.categoryId as string;
          updated.category = resolveCategory(input.categoryId as string);
        }
        return updated;
      })
    );
  };

  const handleLocalDeleteItem = async (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupName.trim()) {
      toast.error("Nama template harus diisi");
      return;
    }

    const validItems = items.filter(
      (item) => item.categoryId && item.itemName && item.unitPrice
    );

    if (validItems.length === 0) {
      toast.error("Mohon tambahkan minimal satu item");
      return;
    }

    const recurringDayNum = recurringDay ? parseInt(recurringDay) : null;
    if (recurringDayNum !== null && (recurringDayNum < 1 || recurringDayNum > 31)) {
      toast.error("Tanggal jadwal harus antara 1-31");
      return;
    }

    const input = {
      name: groupName.trim(),
      recurringDay: recurringDayNum,
      notes: notes.trim() || null,
      items: validItems.map((item) => ({
        categoryId: item.categoryId,
        itemName: item.itemName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      })),
    };

    await createGroup({ variables: { input } });
  };

  const handleDelete = () => {
    deleteGroup({ variables: { id } });
  };

  // Inline editing handlers for edit mode
  const startEditing = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const saveGroupField = async (field: string) => {
    if (!group) return;
    
    let newValue: string | number | null = editValue;
    
    if (field === "recurringDay") {
      newValue = editValue ? parseInt(editValue) : null;
      if (newValue !== null && (newValue < 1 || newValue > 31)) {
        toast.error("Tanggal harus antara 1-31");
        setEditingField(null);
        return;
      }
    }
    
    if (field === "name" && !editValue.trim()) {
      setEditingField(null);
      return;
    }
    
    setIsSaving(true);
    setEditingField(null);
    
    const input: Record<string, unknown> = {};
    if (field === "name") input.name = editValue.trim();
    if (field === "recurringDay") input.recurringDay = newValue;
    if (field === "notes") input.notes = editValue.trim() || null;
    
    await updateGroup({ variables: { id, input } });
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === "Enter") {
      saveGroupField(field);
    } else if (e.key === "Escape") {
      setEditingField(null);
    }
  };

  const isLoading = creating || updating || deleting;

  // Group by category for Per Kategori card
  const categoryTotals = group?.items.reduce((acc, item) => {
    const catName = item.category.name;
    if (!acc[catName]) acc[catName] = 0;
    acc[catName] += item.total;
    return acc;
  }, {} as Record<string, number>) || {};

  // Group by category for new mode
  const newModeCategoryTotals = items.reduce((acc, item) => {
    if (!item.categoryId || !item.unitPrice) return acc;
    const cat = categories.find(c => c.id === item.categoryId);
    const catName = cat?.name || "Tidak Berkategori";
    if (!acc[catName]) acc[catName] = 0;
    acc[catName] += item.unitPrice * item.quantity;
    return acc;
  }, {} as Record<string, number>);

  if (!isNew && loadingGroup) {
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
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[200px] w-full" />
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
              {isNew ? "Tambah Template" : "Edit Template"}
            </h1>
            <p className="text-muted-foreground hidden sm:block">
              {isNew ? "Buat template pengeluaran baru" : "Ubah detail template"}
            </p>
          </div>
        </div>
        {!isNew && (
          <DeleteConfirmDialog
            title="Hapus Template"
            description="Apakah kamu yakin ingin menghapus template ini?"
            onConfirm={handleDelete}
            loading={deleting}
            trigger={
              <Button variant="destructive" size="sm" className="w-fit self-end">
                <Trash2 className="h-4 w-4 mr-2" />
                Hapus
              </Button>
            }
          />
        )}
      </div>

      {/* Edit Mode */}
      {!isNew && group && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Detail Template
                {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Nama Template</Label>
                    {editingField === "name" ? (
                      <Input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveGroupField("name")}
                        onKeyDown={(e) => handleKeyDown(e, "name")}
                        disabled={isSaving}
                      />
                    ) : (
                      <div
                        className="h-10 px-3 flex items-center border rounded-md cursor-pointer hover:bg-muted/50 font-medium"
                        onClick={() => startEditing("name", group.name)}
                      >
                        {group.name}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Jadwal (Tanggal)</Label>
                    {editingField === "recurringDay" ? (
                      <Input
                        ref={inputRef}
                        type="number"
                        min="1"
                        max="31"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveGroupField("recurringDay")}
                        onKeyDown={(e) => handleKeyDown(e, "recurringDay")}
                        placeholder="1-31"
                        disabled={isSaving}
                      />
                    ) : (
                      <div
                        className="h-10 px-3 flex items-center border rounded-md cursor-pointer hover:bg-muted/50 font-medium"
                        onClick={() => startEditing("recurringDay", group.recurringDay?.toString() || "")}
                      >
                        {group.recurringDay ? `Tanggal ${group.recurringDay}` : "-"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Total</Label>
                    <div className="h-10 px-3 flex items-center bg-expense/10 border border-expense/20 rounded-md font-bold text-expense">
                      {formatIDR(group.total)}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Klik pada field untuk mengedit. Perubahan disimpan otomatis.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Per Kategori Card */}
          {Object.keys(categoryTotals).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Per Kategori</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {Object.entries(categoryTotals).map(([category, catTotal]) => (
                    <div key={category} className="flex items-center justify-between text-sm">
                      <span className="text-primary">{category}</span>
                      <span className="font-bold">{formatIDR(catTotal)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          </div>

          {/* Items Table for Edit Mode */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Item</CardTitle>
            </CardHeader>
            <CardContent className="px-6">
              <EditableExpenseTable
                items={group.items}
                onCreateItem={async (input) => {
                  await addItem({ variables: { groupId: id, input } });
                  refetchGroup();
                }}
                onUpdateItem={async (itemId, input) => {
                  await updateItem({ variables: { itemId, input } });
                }}
                onDeleteItem={async (itemId) => {
                  await deleteItem({ variables: { itemId } });
                }}
                onSaveComplete={() => refetchGroup()}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* New Mode */}
      {isNew && (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Info Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nama Template *</Label>
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Contoh: Belanja Bulanan"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jadwal (Tanggal)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={recurringDay}
                    onChange={(e) => setRecurringDay(e.target.value)}
                    placeholder="1-31"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Catatan</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Opsional"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Per Kategori Card - New Mode */}
          {Object.keys(newModeCategoryTotals).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Per Kategori</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {Object.entries(newModeCategoryTotals).map(([category, catTotal]) => (
                    <div key={category} className="flex items-center justify-between text-sm">
                      <span className="text-primary">{category}</span>
                      <span className="font-bold">{formatIDR(catTotal)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daftar Item</CardTitle>
            </CardHeader>
            <CardContent className="px-6">
              <EditableExpenseTable
                items={items.map((item) => ({
                  ...item,
                  category: resolveCategory(item.categoryId),
                  total: item.unitPrice * item.quantity,
                }))}
                onCreateItem={handleLocalCreateItem}
                onUpdateItem={handleLocalUpdateItem}
                onDeleteItem={handleLocalDeleteItem}
                onSaveComplete={() => {}}
              />
            </CardContent>
          </Card>

          <div className="md:static md:mt-6 p-5 pb-8 md:rounded-lg md:border fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-x border-border bg-card">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-expense">
                  {formatIDR(items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0))}
                </p>
              </div>
              <Button type="submit" className="w-fit" disabled={isLoading || !groupName.trim() || items.filter(i => i.categoryId && i.itemName && i.unitPrice).length === 0}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Simpan Template
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
