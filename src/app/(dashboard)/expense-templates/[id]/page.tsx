"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { GET_CATEGORIES } from "@/lib/graphql/queries";
import {
  CREATE_EXPENSE_TEMPLATE_GROUP,
  UPDATE_EXPENSE_TEMPLATE_GROUP,
  DELETE_EXPENSE_TEMPLATE_GROUP,
  ADD_EXPENSE_TEMPLATE_ITEM,
  UPDATE_EXPENSE_TEMPLATE_ITEM,
  DELETE_EXPENSE_TEMPLATE_ITEM,
  CREATE_CATEGORY,
} from "@/lib/graphql/mutations";
import { toast } from "sonner";
import { Loader2, ArrowLeft, FolderPlus, Plus, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatIDR } from "@/lib/utils/currency";
import { formatNumberID } from "@/lib/utils/format";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

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

interface NewItemForm {
  id: string;
  categoryId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
}

const parseNumber = (value: string): number => {
  return parseInt(value.replace(/\D/g, "")) || 0;
};

export default function ExpenseTemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state for new group
  const [groupName, setGroupName] = useState("");
  const [recurringDay, setRecurringDay] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<NewItemForm[]>([]);
  
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

  const { data: categoriesData, refetch: refetchCategories } =
    useQuery<CategoriesData>(GET_CATEGORIES);

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

  const [addItem] = useMutation(ADD_EXPENSE_TEMPLATE_ITEM, {
    onCompleted: () => {
      toast.success("Item berhasil ditambahkan");
      refetchGroup();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [updateItem] = useMutation(UPDATE_EXPENSE_TEMPLATE_ITEM, {
    onCompleted: () => {
      toast.success("Item berhasil diupdate");
      setIsSaving(false);
      setEditingField(null);
      refetchGroup();
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSaving(false);
    },
  });

  const [deleteItem] = useMutation(DELETE_EXPENSE_TEMPLATE_ITEM, {
    onCompleted: () => {
      toast.success("Item berhasil dihapus");
      refetchGroup();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

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

  // Check if last row is empty
  const lastItem = items[items.length - 1];
  const isLastRowEmpty = lastItem && !lastItem.categoryId && !lastItem.itemName && !lastItem.unitPrice;

  const handleAddEmptyRow = () => {
    if (isLastRowEmpty) {
      toast.error("Lengkapi item sebelumnya terlebih dahulu");
      return;
    }
    
    const newItem: NewItemForm = {
      id: crypto.randomUUID(),
      categoryId: "",
      itemName: "",
      unitPrice: 0,
      quantity: 1,
    };
    
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
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

  const saveItemField = async (itemId: string, field: string) => {
    let newValue: string | number | null = editValue;
    
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
    
    setIsSaving(true);
    setEditingField(null);
    
    const input: Record<string, unknown> = {};
    if (field === "itemName") input.itemName = editValue.trim();
    if (field === "unitPrice") input.unitPrice = newValue;
    if (field === "quantity") input.quantity = newValue;
    
    await updateItem({ variables: { itemId, input } });
  };

  const handleItemCategoryChange = async (itemId: string, categoryId: string) => {
    setIsSaving(true);
    await updateItem({ variables: { itemId, input: { categoryId } } });
    setIsSaving(false);
  };

  const handleDeleteItem = async (itemId: string) => {
    await deleteItem({ variables: { itemId } });
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string, itemId?: string) => {
    if (e.key === "Enter") {
      if (itemId) {
        saveItemField(itemId, field);
      } else {
        saveGroupField(field);
      }
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

  // State for adding new item in edit mode
  const [newEditItem, setNewEditItem] = useState<NewItemForm | null>(null);

  const handleAddEditItem = () => {
    if (newEditItem) {
      toast.error("Lengkapi item baru terlebih dahulu");
      return;
    }
    setNewEditItem({
      id: crypto.randomUUID(),
      categoryId: "",
      itemName: "",
      unitPrice: 0,
      quantity: 1,
    });
  };

  const handleSaveNewEditItem = async () => {
    if (!newEditItem || !newEditItem.categoryId || !newEditItem.itemName || !newEditItem.unitPrice) {
      toast.error("Lengkapi semua field item");
      return;
    }
    await addItem({
      variables: {
        groupId: id,
        input: {
          categoryId: newEditItem.categoryId,
          itemName: newEditItem.itemName,
          unitPrice: newEditItem.unitPrice,
          quantity: newEditItem.quantity,
        },
      },
    });
    setNewEditItem(null);
  };

  // Group by category for Per Kategori card
  const categoryTotals = group?.items.reduce((acc, item) => {
    const catName = item.category.name;
    if (!acc[catName]) acc[catName] = 0;
    acc[catName] += item.total;
    return acc;
  }, {} as Record<string, number>) || {};

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

          {/* Items Table for Edit Mode */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Item</CardTitle>
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
                  {group.items.map((item) => (
                    <TableRow key={item.id} className="bg-muted/30">
                      <TableCell>
                        <div className="flex gap-1">
                          <Select
                            value={item.category.id}
                            onValueChange={(value) => handleItemCategoryChange(item.id, value)}
                            disabled={isSaving}
                          >
                            <SelectTrigger className="h-9 min-w-[140px]">
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
                                    placeholder="Contoh: Tagihan Bulanan"
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
                        {editingField === `itemName-${item.id}` ? (
                          <Input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => saveItemField(item.id, "itemName")}
                            onKeyDown={(e) => handleKeyDown(e, "itemName", item.id)}
                            className="h-9 min-w-[120px]"
                            disabled={isSaving}
                          />
                        ) : (
                          <div
                            className="h-9 px-3 flex items-center border rounded-md cursor-pointer hover:bg-muted/50"
                            onClick={() => { setEditingField(`itemName-${item.id}`); setEditValue(item.itemName); }}
                          >
                            {item.itemName}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingField === `unitPrice-${item.id}` ? (
                          <Input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ""))}
                            onBlur={() => saveItemField(item.id, "unitPrice")}
                            onKeyDown={(e) => handleKeyDown(e, "unitPrice", item.id)}
                            className="h-9 text-right min-w-[100px]"
                            disabled={isSaving}
                          />
                        ) : (
                          <div
                            className="h-9 px-3 flex items-center justify-end border rounded-md cursor-pointer hover:bg-muted/50"
                            onClick={() => { setEditingField(`unitPrice-${item.id}`); setEditValue(item.unitPrice.toString()); }}
                          >
                            {formatIDR(item.unitPrice)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingField === `quantity-${item.id}` ? (
                          <Input
                            ref={inputRef}
                            type="number"
                            min="1"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => saveItemField(item.id, "quantity")}
                            onKeyDown={(e) => handleKeyDown(e, "quantity", item.id)}
                            className="h-9 text-center min-w-[60px]"
                            disabled={isSaving}
                          />
                        ) : (
                          <div
                            className="h-9 px-3 flex items-center justify-center border rounded-md cursor-pointer hover:bg-muted/50"
                            onClick={() => { setEditingField(`quantity-${item.id}`); setEditValue(item.quantity.toString()); }}
                          >
                            {item.quantity}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            value={formatIDR(item.total)}
                            className="h-9 text-right font-bold text-expense min-w-[120px]"
                            disabled
                          />
                          <DeleteConfirmDialog
                            title="Hapus Item"
                            description={`Apakah kamu yakin ingin menghapus item "${item.itemName}"?`}
                            onConfirm={() => handleDeleteItem(item.id)}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* New item row in edit mode */}
                  {newEditItem && (
                    <TableRow className="bg-muted/30">
                      <TableCell>
                        <div className="flex gap-1">
                          <Select
                            value={newEditItem.categoryId}
                            onValueChange={(value) => setNewEditItem(prev => prev ? { ...prev, categoryId: value } : null)}
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
                                    placeholder="Contoh: Tagihan Bulanan"
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
                          value={newEditItem.itemName}
                          onChange={(e) => setNewEditItem(prev => prev ? { ...prev, itemName: e.target.value } : null)}
                          className="h-9 min-w-[120px]"
                          placeholder="Nama item"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={newEditItem.unitPrice ? formatNumberID(newEditItem.unitPrice) : ""}
                          onChange={(e) => {
                            const val = parseNumber(e.target.value);
                            setNewEditItem(prev => prev ? { ...prev, unitPrice: val } : null);
                          }}
                          className="h-9 text-right min-w-[100px]"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={newEditItem.quantity}
                          onChange={(e) => setNewEditItem(prev => prev ? { ...prev, quantity: parseInt(e.target.value) || 1 } : null)}
                          className="h-9 text-center min-w-[60px]"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            value={formatIDR(newEditItem.unitPrice * newEditItem.quantity)}
                            className="h-9 text-right font-bold text-expense min-w-[120px]"
                            disabled
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setNewEditItem(null)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {/* Add new row button */}
                  {!newEditItem && (
                    <TableRow
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={handleAddEditItem}
                    >
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Plus className="h-4 w-4" />
                          <span>Tambah item baru</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Save new item card */}
          {newEditItem && (
            <Card>
              <CardContent className="px-6">
                <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
                  <Button
                    onClick={handleSaveNewEditItem}
                    className="w-full sm:w-fit"
                    disabled={!newEditItem.categoryId || !newEditItem.itemName || !newEditItem.unitPrice}
                  >
                    Simpan Item Baru
                  </Button>
                  <div className="text-start sm:text-right w-full sm:w-auto">
                    <p className="text-sm text-muted-foreground">Subtotal Item Baru</p>
                    <p className="text-2xl font-bold text-expense">
                      {formatIDR(newEditItem.unitPrice * newEditItem.quantity)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* New Mode */}
      {isNew && (
        <form onSubmit={handleSubmit}>
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

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Daftar Item</CardTitle>
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
                  {items.map((item) => (
                    <TableRow key={item.id} className="bg-muted/30">
                      <TableCell>
                        <div className="flex gap-1">
                          <Select
                            value={item.categoryId}
                            onValueChange={(value) => {
                              setItems((prev) =>
                                prev.map((i) =>
                                  i.id === item.id ? { ...i, categoryId: value } : i
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
                                <DialogTitle>Tambah Kategori Pengeluaran</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={handleCreateCategory} className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Nama Kategori</Label>
                                  <Input
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    placeholder="Contoh: Tagihan Bulanan"
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
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((i) =>
                                i.id === item.id ? { ...i, itemName: e.target.value } : i
                              )
                            )
                          }
                          className="h-9 min-w-[120px]"
                          placeholder="Nama item"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.unitPrice ? formatNumberID(item.unitPrice) : ""}
                          onChange={(e) => {
                            const val = parseNumber(e.target.value);
                            setItems((prev) =>
                              prev.map((i) =>
                                i.id === item.id ? { ...i, unitPrice: val } : i
                              )
                            );
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
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((i) =>
                                i.id === item.id ? { ...i, quantity: parseInt(e.target.value) || 1 } : i
                              )
                            )
                          }
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
                  <TableRow
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={handleAddEmptyRow}
                  >
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
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
