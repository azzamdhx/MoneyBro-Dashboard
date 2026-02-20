"use client";

import { useState, useEffect, useMemo } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatIDR } from "@/lib/utils/currency";
import { formatNumberID, formatDateID, toRFC3339 } from "@/lib/utils/format";
import {
  CREATE_SAVINGS_GOAL,
  UPDATE_SAVINGS_GOAL,
  DELETE_SAVINGS_GOAL,
  ADD_SAVINGS_CONTRIBUTION,
  WITHDRAW_SAVINGS_CONTRIBUTION,
  MARK_SAVINGS_GOAL_COMPLETE,
} from "@/lib/graphql/mutations";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus, CheckCircle2, Trash2, X } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { MonthPicker } from "@/components/ui/month-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { getSavingsEmoji, setSavingsEmoji } from "@/lib/utils/emoji-storage";

const GET_SAVINGS_GOAL = gql`
  query GetSavingsGoal($id: UUID!) {
    savingsGoal(id: $id) {
      id
      name
      targetAmount
      currentAmount
      targetDate
      icon
      status
      notes
      progress
      remainingAmount
      monthlyTarget
      createdAt
      contributions {
        id
        amount
        contributionDate
        notes
        createdAt
      }
    }
  }
`;

interface SavingsContribution {
  id: string;
  amount: number;
  contributionDate: string;
  notes: string | null;
  createdAt: string;
}

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  icon: string | null;
  status: string;
  notes: string | null;
  progress: number;
  remainingAmount: number;
  monthlyTarget: number;
  createdAt: string;
  contributions: SavingsContribution[];
}

interface SavingsGoalData {
  savingsGoal: SavingsGoal;
}

const formatNumber = (value: string): string => {
  const num = value.replace(/\D/g, "");
  return num ? formatNumberID(parseInt(num)) : "";
};

const parseNumber = (value: string): number => {
  return parseInt(value.replace(/\D/g, "")) || 0;
};

export default function SavingsGoalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [isContributionOpen, setIsContributionOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [emoji, setEmoji] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    targetAmount: "",
    targetDate: "",
    targetMonths: "",
    notes: "",
  });
  const [contributionData, setContributionData] = useState({
    amount: "",
    contributionDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [withdrawId, setWithdrawId] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<SavingsGoalData>(GET_SAVINGS_GOAL, {
    variables: { id },
    skip: isNew,
  });

  const [createGoal, { loading: creating }] = useMutation(CREATE_SAVINGS_GOAL);
  const [updateGoal, { loading: updating }] = useMutation(UPDATE_SAVINGS_GOAL);
  const [deleteGoal, { loading: deleting }] = useMutation(DELETE_SAVINGS_GOAL);
  const [addContribution, { loading: contributing }] = useMutation(ADD_SAVINGS_CONTRIBUTION);
  const [withdrawContribution] = useMutation(WITHDRAW_SAVINGS_CONTRIBUTION);
  const [markComplete, { loading: markingComplete }] = useMutation(MARK_SAVINGS_GOAL_COMPLETE);

  const goal = data?.savingsGoal;

  useEffect(() => {
    if (goal) {
      const targetDateStr = goal.targetDate.split("T")[0];
      const now = new Date();
      const target = new Date(targetDateStr);
      const diffMonths = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
      setFormData({
        name: goal.name,
        targetAmount: formatNumberID(goal.targetAmount),
        targetDate: targetDateStr,
        targetMonths: diffMonths > 0 ? String(diffMonths) : "1",
        notes: goal.notes || "",
      });
      setEmoji(getSavingsEmoji(goal.id));
    }
  }, [goal]);

  const handleEmojiChange = (newEmoji: string) => {
    setEmoji(newEmoji);
    if (!isNew && id) {
      setSavingsEmoji(id, newEmoji);
    }
  };

  const updateTargetDateFromMonths = (months: string) => {
    const m = parseInt(months);
    if (!m || m <= 0) {
      setFormData((prev) => ({ ...prev, targetMonths: months, targetDate: "" }));
      return;
    }
    const date = new Date();
    date.setMonth(date.getMonth() + m);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    setFormData((prev) => ({ ...prev, targetMonths: months, targetDate: `${yyyy}-${mm}-01` }));
  };

  const updateFromMonthPicker = (yearMonth: string) => {
    if (!yearMonth) {
      setFormData((prev) => ({ ...prev, targetDate: "", targetMonths: "" }));
      return;
    }
    const targetDate = `${yearMonth}-01`;
    const now = new Date();
    const [y, mo] = yearMonth.split("-").map(Number);
    const diffMonths = (y - now.getFullYear()) * 12 + (mo - 1 - now.getMonth());
    setFormData((prev) => ({ ...prev, targetDate, targetMonths: diffMonths > 0 ? String(diffMonths) : "1" }));
  };

  const calculatedMonthlyTarget = useMemo(() => {
    const amount = parseNumber(formData.targetAmount);
    const months = parseInt(formData.targetMonths);
    if (!amount || !months || months <= 0) return 0;
    return Math.ceil(amount / months);
  }, [formData.targetAmount, formData.targetMonths]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAmount = parseNumber(formData.targetAmount);
    if (!formData.name || targetAmount <= 0 || !formData.targetDate) {
      toast.error("Lengkapi semua field yang wajib diisi");
      return;
    }

    try {
      if (isNew) {
        const res = await createGoal({
          variables: {
            input: {
              name: formData.name,
              targetAmount,
              targetDate: toRFC3339(formData.targetDate),
              notes: formData.notes || null,
            },
          },
        });
        const newId = (res.data as { createSavingsGoal: { id: string } }).createSavingsGoal.id;
        if (emoji && newId) {
          setSavingsEmoji(newId, emoji);
        }
        toast.success("Tabungan berhasil dibuat");
        router.replace(`/savings/${newId}`);
      } else {
        await updateGoal({
          variables: {
            id,
            input: {
              name: formData.name,
              targetAmount,
              targetDate: toRFC3339(formData.targetDate),
              notes: formData.notes || null,
            },
          },
        });
        toast.success("Tabungan berhasil diperbarui");
        router.push("/savings");
      }
    } catch {
      toast.error(isNew ? "Gagal membuat tabungan" : "Gagal memperbarui tabungan");
    }
  };

  const handleDelete = () => {
    deleteGoal({
      variables: { id },
      onCompleted: () => {
        toast.success("Tabungan berhasil dihapus");
        router.push("/savings");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseNumber(contributionData.amount);
    if (amount <= 0 || !contributionData.contributionDate) {
      toast.error("Lengkapi data kontribusi");
      return;
    }

    try {
      await addContribution({
        variables: {
          input: {
            savingsGoalId: id,
            amount,
            contributionDate: toRFC3339(contributionData.contributionDate),
            notes: contributionData.notes || null,
          },
        },
      });
      toast.success("Kontribusi berhasil ditambahkan");
      setIsContributionOpen(false);
      setContributionData({
        amount: "",
        contributionDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
      refetch();
    } catch {
      toast.error("Gagal menambahkan kontribusi");
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawId) return;
    try {
      await withdrawContribution({ variables: { id: withdrawId } });
      toast.success("Kontribusi berhasil ditarik");
      setWithdrawId(null);
      refetch();
    } catch {
      toast.error("Gagal menarik kontribusi");
    }
  };

  const isLoading = creating || updating || deleting;

  if (!isNew && loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            {!isNew && emoji && (
              <span className="text-3xl">{emoji}</span>
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {isNew ? "Tambah Tabungan" : goal?.name}
              </h1>
              <p className="text-muted-foreground hidden sm:block">
                {isNew ? "Buat target tabungan baru" : "Detail tabungan"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {(isNew || goal?.status === "ACTIVE") && (
            <Button type="submit" form="savings-form" className="w-fit hidden md:inline-flex" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isNew ? "Simpan" : "Perbarui"}
            </Button>
          )}
          {!isNew && goal?.status === "ACTIVE" && (
            <>
              <Button
                variant="outline"
                onClick={() => markComplete({ variables: { id } })}
                disabled={markingComplete}
                className="hidden md:inline-flex"
              >
                {markingComplete ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Tandai Selesai
              </Button>
              <DeleteConfirmDialog
                title="Hapus Tabungan"
                description="Apakah kamu yakin ingin menghapus tabungan ini? Semua riwayat kontribusi juga akan dihapus."
                onConfirm={handleDelete}
                loading={deleting}
                trigger={
                  <Button variant="destructive" size="sm" className="w-fit">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Hapus
                  </Button>
                }
              />
            </>
          )}
        </div>
      </div>

      {/* Contribution Dialog */}
      <Dialog open={isContributionOpen} onOpenChange={setIsContributionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Kontribusi</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddContribution} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contrib-amount">Jumlah (Rp) *</Label>
              <Input
                id="contrib-amount"
                value={contributionData.amount}
                onChange={(e) =>
                  setContributionData({
                    ...contributionData,
                    amount: formatNumber(e.target.value),
                  })
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal *</Label>
              <DatePicker
                value={contributionData.contributionDate}
                onChange={(val) =>
                  setContributionData({
                    ...contributionData,
                    contributionDate: val,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contrib-notes">Catatan</Label>
              <Input
                id="contrib-notes"
                value={contributionData.notes}
                onChange={(e) =>
                  setContributionData({
                    ...contributionData,
                    notes: e.target.value,
                  })
                }
                placeholder="Opsional"
              />
            </div>
            <Button type="submit" className="w-full" disabled={contributing}>
              {contributing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Tambah Kontribusi
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Withdraw Confirmation */}
      {withdrawId && (
        <Dialog open={!!withdrawId} onOpenChange={(open) => !open && setWithdrawId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tarik Kontribusi</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Kontribusi akan dihapus dan saldo tabungan akan dikurangi. Lanjutkan?
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setWithdrawId(null)}>Batal</Button>
                <Button variant="destructive" onClick={handleWithdraw}>Hapus</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Stats Cards — Detail view only */}
      {!isNew && goal && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">Terkumpul</p>
              <p className="text-2xl font-bold text-savings">
                {formatIDR(goal.currentAmount)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">Progress</p>
              <div className="space-y-1">
                <p className="text-2xl font-bold">
                  {Math.round(goal.progress)}%
                </p>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-savings h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(goal.progress, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">Sisa Target</p>
              <p className="text-2xl font-bold text-destructive">
                {formatIDR(goal.remainingAmount)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">Deadline</p>
              <p className="text-2xl font-bold">{formatDateID(goal.targetDate)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contribution History — Detail view only */}
      {!isNew && goal && goal.contributions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Kontribusi</CardTitle>
          </CardHeader>
          <CardContent className="px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead className="hidden sm:table-cell">Catatan</TableHead>
                  {goal.status === "ACTIVE" && <TableHead className="text-right w-12"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {goal.contributions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-savings" />
                        {formatDateID(c.contributionDate)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatIDR(c.amount)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {c.notes || "-"}
                    </TableCell>
                    {goal.status === "ACTIVE" && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setWithdrawId(c.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Form — show when new or active */}
      {(isNew || goal?.status === "ACTIVE") && (
        <form id="savings-form" onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>{isNew ? "Detail Tabungan" : "Edit Tabungan"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Tabungan</Label>
                <div className="flex items-center gap-2">
                  <EmojiPicker
                    value={emoji}
                    onChange={handleEmojiChange}
                  />
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Contoh: Dana Darurat, Liburan, dll"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target (Rp)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      Rp
                    </span>
                    <Input
                      value={formData.targetAmount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          targetAmount: formatNumber(e.target.value),
                        }))
                      }
                      placeholder="10.000.000"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Target (Bulan)</Label>
                  <Input
                    type="number"
                    value={formData.targetMonths}
                    onChange={(e) => updateTargetDateFromMonths(e.target.value)}
                    placeholder="12"
                    min="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Target Bulan</Label>
                <MonthPicker
                  value={formData.targetDate ? formData.targetDate.slice(0, 7) : ""}
                  onChange={updateFromMonthPicker}
                  disablePast
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Catatan (opsional)</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Catatan tambahan"
                />
              </div>
            </CardContent>
          </Card>

          <div className="md:static md:mt-6 p-5 pb-8 md:p-6 md:rounded-lg md:border fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-x border-border bg-card">
            {isNew ? (
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nabung per bulan</p>
                  <p className="text-2xl font-bold text-savings">
                    {formatIDR(calculatedMonthlyTarget)}
                  </p>
                </div>
                <Button type="submit" form="savings-form" className="w-fit" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Simpan
                </Button>
              </div>
            ) : goal?.status === "ACTIVE" && (
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Target Bulanan</p>
                  <p className="text-2xl font-bold text-savings">
                    {formatIDR(goal?.monthlyTarget || 0)}
                  </p>
                </div>
                <Button
                  className="w-fit"
                  type="button"
                  onClick={() => setIsContributionOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Kontribusi
                </Button>
              </div>
            )}
          </div>
        </form>
      )}
    </div>

    {/* Floating Action Button - Mobile Only */}
    {!isNew && goal?.status === "ACTIVE" && (
      <div className="fixed bottom-28 right-6 z-[60] md:hidden">
        <Popover open={fabOpen} onOpenChange={setFabOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200",
                fabOpen
                  ? "bg-destructive text-destructive-foreground scale-95"
                  : "bg-primary text-primary-foreground"
              )}
            >
              {fabOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Plus className="h-6 w-6" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-52 p-2 mb-2 border-border/50 shadow-2xl backdrop-blur-xl bg-gradient-to-b from-card/95 to-background/95"
            align="end"
            side="top"
          >
            <div className="grid gap-1">
              <button
                onClick={() => {
                  setIsContributionOpen(true);
                  setFabOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-muted-foreground hover:bg-muted"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Kontribusi</span>
              </button>
              <button
                onClick={() => {
                  markComplete({ variables: { id } });
                  setFabOpen(false);
                }}
                disabled={markingComplete}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                {markingComplete ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>Tandai Selesai</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )}
    </>
  );
}
