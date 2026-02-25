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
import { GET_INCOME_CATEGORIES } from "@/lib/graphql/queries";
import {
  CREATE_RECURRING_INCOME_GROUP,
  UPDATE_RECURRING_INCOME_GROUP,
  DELETE_RECURRING_INCOME_GROUP,
  ADD_RECURRING_INCOME_ITEM,
  UPDATE_RECURRING_INCOME_ITEM,
  DELETE_RECURRING_INCOME_ITEM,
} from "@/lib/graphql/mutations";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { formatIDR } from "@/lib/utils/currency";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { EditableIncomeTable } from "@/components/income/editable-income-table";

const GET_RECURRING_INCOME_GROUP = gql`
  query GetRecurringIncomeGroup($id: UUID!) {
    recurringIncomeGroup(id: $id) {
      id
      name
      recurringDay
      isActive
      notes
      total
      items {
        id
        sourceName
        amount
        category {
          id
          name
        }
      }
    }
  }
`;

interface IncomeCategory {
  id: string;
  name: string;
}

interface RecurringIncomeItemData {
  id: string;
  sourceName: string;
  amount: number;
  category: IncomeCategory;
}

interface RecurringIncomeGroup {
  id: string;
  name: string;
  recurringDay: number | null;
  isActive: boolean;
  notes: string | null;
  total: number;
  items: RecurringIncomeItemData[];
}

interface IncomeCategoriesData {
  incomeCategories: IncomeCategory[];
}

interface RecurringIncomeGroupData {
  recurringIncomeGroup: RecurringIncomeGroup;
}

interface DraftIncomeItem {
  id: string;
  categoryId: string;
  sourceName: string;
  amount: number;
  category: IncomeCategory;
}

export default function RecurringIncomeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [isSaving, setIsSaving] = useState(false);

  // Form state for new group
  const [groupName, setGroupName] = useState("");
  const [recurringDay, setRecurringDay] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftIncomeItem[]>([]);

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

  const { data: categoriesData } = useQuery<IncomeCategoriesData>(GET_INCOME_CATEGORIES);

  const { data: groupData, loading: loadingGroup, refetch: refetchGroup } = useQuery<RecurringIncomeGroupData>(
    GET_RECURRING_INCOME_GROUP,
    {
      variables: { id },
      skip: isNew,
    }
  );

  const group = groupData?.recurringIncomeGroup;

  const [createGroup] = useMutation<{ createRecurringIncomeGroup: RecurringIncomeGroup }>(CREATE_RECURRING_INCOME_GROUP, {
    update: (cache, { data }) => {
      if (!data) return;
      cache.writeQuery({
        query: GET_RECURRING_INCOME_GROUP,
        variables: { id: data.createRecurringIncomeGroup.id },
        data: { recurringIncomeGroup: data.createRecurringIncomeGroup },
      });
    },
    onCompleted: (data) => {
      toast.success("Pemasukkan tetap berhasil ditambahkan");
      router.replace(`/recurring-incomes/${data.createRecurringIncomeGroup.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [updateGroup] = useMutation(UPDATE_RECURRING_INCOME_GROUP, {
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

  const [deleteGroup, { loading: deleting }] = useMutation(DELETE_RECURRING_INCOME_GROUP, {
    onCompleted: () => {
      toast.success("Pemasukkan tetap berhasil dihapus");
      router.push("/recurring-incomes");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [addItem] = useMutation(ADD_RECURRING_INCOME_ITEM);
  const [updateItem] = useMutation(UPDATE_RECURRING_INCOME_ITEM);
  const [deleteItem] = useMutation(DELETE_RECURRING_INCOME_ITEM);

  const categories: IncomeCategory[] = categoriesData?.incomeCategories || [];

  const resolveCategory = (categoryId: string) => categories.find(c => c.id === categoryId) || { id: categoryId, name: "" };

  const handleLocalCreateItem = async (input: { sourceName: string; categoryId: string; amount: number }) => {
    const newItem: DraftIncomeItem = {
      id: crypto.randomUUID(),
      sourceName: input.sourceName,
      amount: input.amount,
      categoryId: input.categoryId,
      category: resolveCategory(input.categoryId),
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleLocalUpdateItem = async (itemId: string, input: Record<string, unknown>) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item;
        const updated: DraftIncomeItem = { ...item };
        if (input.sourceName !== undefined) updated.sourceName = input.sourceName as string;
        if (input.amount !== undefined) updated.amount = input.amount as number;
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
      toast.error("Nama grup harus diisi");
      return;
    }

    const validItems = items.filter(
      (item) => item.categoryId && item.sourceName && item.amount
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
        sourceName: item.sourceName,
        amount: item.amount,
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

  const handleActiveChange = async (isActive: boolean) => {
    if (!group) return;
    setIsSaving(true);
    await updateGroup({ variables: { id, input: { isActive } } });
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === "Enter") {
      saveGroupField(field);
    } else if (e.key === "Escape") {
      setEditingField(null);
    }
  };

  // Group by category for Per Kategori card
  const categoryTotals = group?.items.reduce((acc, item) => {
    const catName = item.category.name;
    if (!acc[catName]) acc[catName] = 0;
    acc[catName] += item.amount;
    return acc;
  }, {} as Record<string, number>) || {};

  // Group by category for new mode
  const newModeCategoryTotals = items.reduce((acc, item) => {
    if (!item.categoryId || !item.amount) return acc;
    const cat = categories.find(c => c.id === item.categoryId);
    const catName = cat?.name || "Tidak Berkategori";
    if (!acc[catName]) acc[catName] = 0;
    acc[catName] += item.amount;
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
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
              {isNew ? "Pemasukkan Tetap" : "Edit Pemasukkan Tetap"}
            </h1>
          </div>
        </div>
        {!isNew && (
          <DeleteConfirmDialog
            title="Hapus Pemasukkan Tetap"
            description="Apakah kamu yakin ingin menghapus pemasukkan tetap ini?"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Detail
                {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Nama Grup</Label>
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
                        inputMode="numeric"
                        pattern="[0-9]*"
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Total</Label>
                    <div className="h-10 px-3 flex items-center bg-income/10 border border-income/20 rounded-md font-bold text-income">
                      {formatIDR(group.total)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <div className="flex items-center justify-between h-10 px-3 border rounded-md">
                      <span className={group.isActive ? "text-income" : "text-muted-foreground"}>
                        {group.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                      <Switch
                        checked={group.isActive}
                        onCheckedChange={handleActiveChange}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Per Kategori Card */}
          {Object.keys(categoryTotals).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Per Kategori</CardTitle>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
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
            <CardContent className="px-4 md:px-6">
              <EditableIncomeTable
                items={group.items}
                onCreateItem={async (input) => {
                  await addItem({ variables: { groupId: id, input: { categoryId: input.categoryId, sourceName: input.sourceName, amount: input.amount } } });
                  refetchGroup();
                }}
                onUpdateItem={async (itemId, { pocketId: _, ...input }) => {
                  void _;
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
        <form id="recurring-income-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 md:px-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nama</Label>
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Gaji Bulanan"
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
                    inputMode="numeric"
                    pattern="[0-9]*"
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
            <CardHeader className="px-4 md:px-6">
              <CardTitle>Daftar Item</CardTitle>
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              <EditableIncomeTable
                items={items.map((item) => ({
                  ...item,
                  category: resolveCategory(item.categoryId),
                }))}
                onCreateItem={handleLocalCreateItem}
                onUpdateItem={handleLocalUpdateItem}
                onDeleteItem={handleLocalDeleteItem}
                onSaveComplete={() => {
                  setTimeout(() => {
                    (document.getElementById('recurring-income-form') as HTMLFormElement)?.requestSubmit();
                  }, 0);
                }}
              />
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
