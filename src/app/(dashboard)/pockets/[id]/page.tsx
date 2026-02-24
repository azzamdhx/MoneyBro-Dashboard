"use client";

import { useState, useEffect } from "react";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatIDR } from "@/lib/utils/currency";
import { formatNumberID, formatMonthYear } from "@/lib/utils/format";
import {
  CREATE_POCKET,
  UPDATE_POCKET,
  DELETE_POCKET,
  TRANSFER_BETWEEN_POCKETS,
} from "@/lib/graphql/mutations";
import { GET_POCKETS } from "@/lib/graphql/queries";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRightLeft, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { ColorPicker } from "@/components/ui/color-picker";
import { MonthPicker } from "@/components/ui/month-picker";

const GET_POCKET = gql`
  query GetPocket($id: UUID!) {
    pocket(id: $id) {
      id
      name
      currentBalance
      isDefault
      isPocket
      icon
      cardBgColor
      sortOrder
      createdAt
    }
  }
`;

const GET_POCKET_ENTRIES = gql`
  query GetPocketEntries($pocketId: UUID!) {
    pocketEntries(pocketId: $pocketId) {
      id
      transactionDate
      description
      debit
      credit
      referenceType
    }
  }
`;

interface Pocket {
  id: string;
  name: string;
  currentBalance: number;
  isDefault: boolean;
  isPocket: boolean;
  icon: string | null;
  cardBgColor: string | null;
  sortOrder: number;
  createdAt: string;
}

interface PocketData {
  pocket: Pocket;
}

interface PocketsData {
  pockets: Pocket[];
}

interface PocketEntry {
  id: string;
  transactionDate: string;
  description: string;
  debit: number;
  credit: number;
  referenceType: string | null;
}

interface PocketEntriesData {
  pocketEntries: PocketEntry[];
}

const formatNumber = (value: string): string => {
  const num = value.replace(/\D/g, "");
  return num ? formatNumberID(parseInt(num)) : "";
};

const parseNumber = (value: string): number => {
  return parseInt(value.replace(/\D/g, "")) || 0;
};

export default function PocketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [emoji, setEmoji] = useState("");
  const [cardBgColor, setCardBgColor] = useState<string | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [formData, setFormData] = useState({
    name: "",
  });
  const [transferData, setTransferData] = useState({
    toPocketId: "",
    amount: "",
    description: "",
  });

  const { data, loading, refetch } = useQuery<PocketData>(GET_POCKET, {
    variables: { id },
    skip: isNew,
  });

  const { data: pocketsData } = useQuery<PocketsData>(GET_POCKETS);
  const { data: entriesData, loading: loadingEntries } = useQuery<PocketEntriesData>(GET_POCKET_ENTRIES, {
    variables: { pocketId: id },
    skip: isNew,
  });

  const [createPocket, { loading: creating }] = useMutation(CREATE_POCKET);
  const [updatePocket, { loading: updating }] = useMutation(UPDATE_POCKET);
  const [deletePocket, { loading: deleting }] = useMutation(DELETE_POCKET);
  const [transferBetweenPockets, { loading: transferring }] = useMutation(TRANSFER_BETWEEN_POCKETS);

  const pocket = data?.pocket;

  const allEntries = entriesData?.pocketEntries || [];
  const previousBalance = allEntries
    .filter((e) => e.transactionDate.slice(0, 7) < selectedMonth)
    .reduce((sum, e) => sum + e.debit - e.credit, 0);
  const carryOver = Math.max(previousBalance, 0);
  const monthEntries = allEntries.filter(
    (e) => e.transactionDate.slice(0, 7) === selectedMonth
  );
  const monthIn = monthEntries.reduce((sum, e) => sum + e.debit, 0);
  const monthOut = monthEntries.reduce((sum, e) => sum + e.credit, 0);
  const totalIn = monthIn + carryOver;
  const totalOut = monthOut;
  const monthlyBalance = totalIn - totalOut;
  const otherPockets = (pocketsData?.pockets || []).filter((p) => p.id !== id);

  useEffect(() => {
    if (pocket) {
      setFormData({
        name: pocket.name,
      });
      setEmoji(pocket.icon || "");
      setCardBgColor(pocket.cardBgColor || null);
    }
  }, [pocket]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Nama pocket wajib diisi");
      return;
    }

    try {
      if (isNew) {
        const res = await createPocket({
          variables: {
            input: {
              name: formData.name,
              icon: emoji || null,
              cardBgColor,
            },
          },
        });
        toast.success("Pocket berhasil dibuat");
        const newId = (res.data as { createPocket: { id: string } }).createPocket.id;
        router.replace(`/pockets/${newId}`);
      } else {
        await updatePocket({
          variables: {
            id,
            input: {
              name: formData.name,
              icon: emoji || null,
              cardBgColor,
            },
          },
        });
        toast.success("Pocket berhasil diperbarui");
        refetch();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan pocket");
    }
  };

  const handleDelete = async () => {
    try {
      await deletePocket({ variables: { id } });
      toast.success("Pocket berhasil dihapus");
      router.replace("/pockets");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus pocket");
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseNumber(transferData.amount);
    if (!transferData.toPocketId || amount <= 0) {
      toast.error("Lengkapi data transfer");
      return;
    }
    if (amount > monthlyBalance) {
      toast.error(`Saldo bulan ini tidak cukup. Maksimal: ${formatIDR(monthlyBalance)}`);
      return;
    }

    try {
      await transferBetweenPockets({
        variables: {
          input: {
            fromPocketId: id,
            toPocketId: transferData.toPocketId,
            amount,
            description: transferData.description || null,
          },
        },
      });
      toast.success("Transfer berhasil");
      setIsTransferOpen(false);
      setTransferData({ toPocketId: "", amount: "", description: "" });
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal transfer");
    }
  };

  if (!isNew && loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/pockets")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isNew ? "Tambah Pocket" : pocket?.name || "Detail Pocket"}
          </h1>
        </div>
      </div>

      {/* Transfer & Actions */}
      {!isNew && pocket && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsTransferOpen(true)}
            disabled={otherPockets.length === 0}
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transfer
          </Button>
          {!pocket.isDefault && (
            <DeleteConfirmDialog
              title="Hapus Pocket"
              description={`Yakin ingin menghapus pocket "${pocket.name}"? Saldo harus 0 untuk menghapus pocket.`}
              onConfirm={handleDelete}
              loading={deleting}
            />
          )}
        </div>
      )}

      {/* MonthPicker + Pocket Info */}
      {!isNew && pocket && (
        <>
          <MonthPicker
            value={selectedMonth}
            onChange={setSelectedMonth}
          />
          <Card>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Masuk</p>
                  <p className="text-lg font-bold text-income">{formatIDR(totalIn)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Keluar</p>
                  <p className="text-lg font-bold text-expense">{formatIDR(totalOut)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{formatMonthYear(selectedMonth + "-01")}</p>
                  <p className="text-lg font-bold">{formatIDR(monthlyBalance)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Saldo</p>
                  <p className="text-lg font-bold">{formatIDR(pocket.currentBalance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>{isNew ? "Data Pocket Baru" : "Edit Pocket"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-end gap-3">
              <EmojiPicker value={emoji} onChange={setEmoji} />
              <ColorPicker value={cardBgColor} onChange={setCardBgColor} />
              <div className="flex-1">
                <Label htmlFor="name" className="pb-3">Nama Pocket</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Belanja Bulanan"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={creating || updating}>
                {(creating || updating) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isNew ? "Buat Pocket" : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Credit & Debit Detail */}
      {!isNew && pocket && (
        <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Credit (Masuk) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowDownLeft className="h-4 w-4 text-income" />
                Masuk
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingEntries ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (() => {
                const credits = monthEntries.filter(e => e.debit > 0);
                const hasData = credits.length > 0 || carryOver > 0;
                return hasData ? (
                  <div className="space-y-2">
                    {carryOver > 0 && (
                      <div className="flex items-center justify-between py-2 border-b last:border-0 bg-muted/30 rounded px-2 -mx-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">Saldo Bulan Sebelumnya</p>
                          <p className="text-xs text-muted-foreground">Carry over</p>
                        </div>
                        <p className="text-sm font-bold text-income ml-3 shrink-0">+{formatIDR(carryOver)}</p>
                      </div>
                    )}
                    {credits.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{entry.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.transactionDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-income ml-3 shrink-0">+{formatIDR(entry.debit)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Belum ada transaksi masuk</p>
                );
              })()}
            </CardContent>
          </Card>

          {/* Debit (Keluar) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowUpRight className="h-4 w-4 text-expense" />
                Keluar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingEntries ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (() => {
                const debits = monthEntries.filter(e => e.credit > 0);
                return debits.length > 0 ? (
                  <div className="space-y-2">
                    {debits.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{entry.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.transactionDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-expense ml-3 shrink-0">-{formatIDR(entry.credit)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Belum ada transaksi keluar</p>
                );
              })()}
            </CardContent>
          </Card>
        </div>
        </div>
      )}

      {/* Transfer Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer ke Pocket Lain</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <Label>Dari</Label>
              <Input value={pocket?.name || ""} disabled />
              {pocket && (
                <p className="text-xs text-muted-foreground mt-1">
                  Saldo {formatMonthYear(selectedMonth + "-01")}: {formatIDR(monthlyBalance)}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="toPocket">Ke Pocket</Label>
              <Select
                value={transferData.toPocketId}
                onValueChange={(v) => setTransferData({ ...transferData, toPocketId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pocket tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {otherPockets.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.icon ? `${p.icon} ` : ""}{p.name} ({formatIDR(p.currentBalance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="transferAmount">Jumlah</Label>
              <Input
                id="transferAmount"
                value={transferData.amount}
                onChange={(e) => setTransferData({ ...transferData, amount: formatNumber(e.target.value) })}
                placeholder="0"
                required
              />
            </div>

            <div>
              <Label htmlFor="transferDesc">Keterangan (opsional)</Label>
              <Input
                id="transferDesc"
                value={transferData.description}
                onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                placeholder="Contoh: Transfer untuk belanja"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsTransferOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={transferring}>
                {transferring && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Transfer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
