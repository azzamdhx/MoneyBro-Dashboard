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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatIDR } from "@/lib/utils/currency";
import { formatNumberID, formatDateShortID, formatDateID, toRFC3339 } from "@/lib/utils/format";

import {
  CREATE_DEBT,
  UPDATE_DEBT,
  DELETE_DEBT,
  RECORD_DEBT_PAYMENT,
  MARK_DEBT_COMPLETE,
} from "@/lib/graphql/mutations";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus, CheckCircle2, X, Trash2 } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { getDebtEmoji, setDebtEmoji } from "@/lib/utils/emoji-storage";

const GET_DEBT = gql`
  query GetDebt($id: UUID!) {
    debt(id: $id) {
      id
      personName
      actualAmount
      loanAmount
      paymentType
      monthlyPayment
      tenor
      dueDate
      status
      notes
      createdAt
      totalToPay
      paidAmount
      remainingAmount
      interestAmount
      interestPercentage
      payments {
        id
        paymentNumber
        amount
        paidAt
      }
    }
  }
`;

interface DebtPayment {
  id: string;
  paymentNumber: number;
  amount: number;
  paidAt: string;
}

interface Debt {
  id: string;
  personName: string;
  actualAmount: number;
  loanAmount: number;
  paymentType: string;
  monthlyPayment: number;
  tenor: number;
  dueDate: string | null;
  status: string;
  notes: string | null;
  totalToPay: number;
  paidAmount: number;
  remainingAmount: number;
  interestAmount: number;
  interestPercentage: number;
  payments: DebtPayment[];
  paidCount?: number;
  remainingPayments?: number;
}

interface DebtData {
  debt: Debt;
}

const PAYMENT_TYPES = [
  { value: "INSTALLMENT", label: "Cicilan Bulanan" },
  { value: "ONE_TIME", label: "Bayar Sekaligus" },
];

const formatNumber = (value: string): string => {
  const num = value.replace(/\D/g, "");
  return num ? formatNumberID(parseInt(num)) : "";
};

const parseNumber = (value: string): number => {
  return parseInt(value.replace(/\D/g, "")) || 0;
};

export default function DebtDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [fabOpen, setFabOpen] = useState(false);
  const [emoji, setEmoji] = useState("");
  const [formData, setFormData] = useState({
    personName: "",
    actualAmount: "",
    paymentType: "INSTALLMENT",
    tenor: "",
    dueDate: "",
    notes: "",
  });

  const { data: debtData, loading: loadingDebt, refetch } = useQuery<DebtData>(
    GET_DEBT,
    {
      variables: { id },
      skip: isNew,
    }
  );

  const debt = debtData?.debt;

  useEffect(() => {
    if (debt) {
      setFormData({
        personName: debt.personName,
        actualAmount: formatNumberID(debt.actualAmount),
        paymentType: debt.paymentType,
        tenor: debt.tenor?.toString() || "",
        dueDate: debt.dueDate?.slice(0, 10) || "",
        notes: debt.notes || "",
      });
      setPaymentAmount(debt.monthlyPayment ? formatNumberID(debt.monthlyPayment) : "");
      setEmoji(getDebtEmoji(debt.id));
    }
  }, [debt]);

  const handleEmojiChange = (newEmoji: string) => {
    setEmoji(newEmoji);
    if (!isNew && id) {
      setDebtEmoji(id, newEmoji);
    }
  };

  const [createDebt, { loading: creating }] = useMutation(CREATE_DEBT, {
    onCompleted: (data) => {
      const newId = (data as { createDebt: { id: string } }).createDebt.id;
      if (emoji && newId) {
        setDebtEmoji(newId, emoji);
      }
      toast.success("Hutang berhasil ditambahkan");
      router.push("/debts");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [updateDebt, { loading: updating }] = useMutation(UPDATE_DEBT, {
    onCompleted: () => {
      toast.success("Hutang berhasil diperbarui");
      router.push("/debts");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [deleteDebt, { loading: deleting }] = useMutation(DELETE_DEBT, {
    onCompleted: () => {
      toast.success("Hutang berhasil dihapus");
      router.push("/debts");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [recordPayment, { loading: recordingPayment }] = useMutation(RECORD_DEBT_PAYMENT, {
    onCompleted: () => {
      toast.success("Pembayaran berhasil dicatat");
      setIsPaymentOpen(false);
      setPaymentAmount("");
      setPaymentDate(new Date().toISOString().split("T")[0]);  // Reset tanggal
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [markComplete, { loading: markingComplete }] = useMutation(MARK_DEBT_COMPLETE, {
    onCompleted: () => {
      toast.success("Hutang ditandai lunas");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.personName || !formData.actualAmount) {
      toast.error("Mohon lengkapi nama dan jumlah hutang");
      return;
    }

    const input: Record<string, unknown> = {
      personName: formData.personName,
      actualAmount: parseNumber(formData.actualAmount),
      paymentType: formData.paymentType,
      dueDate: formData.dueDate ? toRFC3339(formData.dueDate) : null,
      notes: formData.notes || null,
    };

    if (formData.paymentType === "INSTALLMENT" && formData.tenor) {
      input.tenor = parseInt(formData.tenor);
    }

    if (isNew) {
      createDebt({ variables: { input } });
    } else {
      updateDebt({ variables: { id, input } });
    }
  };

  const handleDelete = () => {
    deleteDebt({ variables: { id } });
  };

  const handleRecordPayment = () => {
    if (!paymentAmount || !paymentDate) {
      toast.error("Mohon lengkapi tanggal dan jumlah pembayaran");
      return;
    }
    recordPayment({
      variables: {
        input: {
          debtId: id,
          amount: parseNumber(paymentAmount),
          paidAt: toRFC3339(paymentDate),
        },
      },
    });
  };

  const isLoading = creating || updating || deleting;
  const monthlyPayment = formData.paymentType === "INSTALLMENT" && formData.tenor
    ? Math.ceil(parseNumber(formData.actualAmount) / parseInt(formData.tenor))
    : parseNumber(formData.actualAmount);

  if (!isNew && loadingDebt) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
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

        {/* Payment History Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Form Skeleton */}
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
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
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
                {isNew ? "Tambah Hutang" : debt?.personName}
              </h1>
              <p className="text-muted-foreground hidden sm:block">
                {isNew ? "Catat hutang baru" : "Detail hutang"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {(isNew || debt?.status === "ACTIVE") && (
            <Button type="submit" form="debt-form" className="w-fit hidden md:inline-flex" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isNew ? "Simpan" : "Perbarui"}
            </Button>
          )}
          {!isNew && debt?.status === "ACTIVE" && (
            <>
              <Button
                variant="outline"
                onClick={() => markComplete({ variables: { id } })}
                disabled={markingComplete}
                className="hidden md:inline-flex"
              >
                {markingComplete ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Tandai Lunas
              </Button>
              <DeleteConfirmDialog
                title="Hapus Hutang"
                description="Apakah kamu yakin ingin menghapus hutang ini? Semua riwayat pembayaran juga akan dihapus."
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

      {/* Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bayar Hutang</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tanggal Pembayaran</Label>
              <DatePicker
                value={paymentDate}
                onChange={setPaymentDate}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Jumlah Pembayaran</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  Rp
                </span>
                <Input
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(formatNumber(e.target.value))}
                  placeholder={debt?.monthlyPayment ? formatNumberID(debt.monthlyPayment) : "0"}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Sisa hutang: {formatIDR(debt?.remainingAmount || 0)}
              </p>
            </div>

            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleRecordPayment}
              disabled={recordingPayment || !paymentDate}
            >
              {recordingPayment && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Konfirmasi Pembayaran
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!isNew && debt && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                {debt.paymentType === "INSTALLMENT" ? "Cicilan Bulanan" : "Total Hutang"}
              </p>
              <p className="text-2xl font-bold text-primary">
                {formatIDR(debt.paymentType === "INSTALLMENT" ? (debt.monthlyPayment || 0) : debt.actualAmount)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">Sudah Dibayar</p>
              <p className="text-2xl font-bold text-primary">
                {formatIDR(debt.paidAmount)}
              </p>
              {debt.paymentType === "INSTALLMENT" && debt.tenor && (
                <p className="text-xs text-muted-foreground mt-1">
                  {debt.payments.length} dari {debt.tenor} pembayaran
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">Sisa Hutang</p>
              <p className="text-2xl font-bold text-debt">
                {formatIDR(debt.remainingAmount)}
              </p>
              {debt.paymentType === "INSTALLMENT" && debt.tenor && (
                <p className="text-xs text-muted-foreground mt-1">
                  {debt.tenor - debt.payments.length} pembayaran lagi
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">Jatuh Tempo</p>
              <p className="text-2xl font-bold">
                {debt.dueDate
                  ? formatDateShortID(debt.dueDate)
                  : "-"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {!isNew && debt && debt.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pembayaran Ke</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debt.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-income" />
                        #{payment.paymentNumber}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDateID(payment.paidAt)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatIDR(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {(isNew || debt?.status === "ACTIVE") && (
        <form id="debt-form" onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>{isNew ? "Detail Hutang" : "Edit Hutang"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Pemberi Hutang</Label>
                <div className="flex items-center gap-2">
                  <EmojiPicker
                    value={emoji}
                    onChange={handleEmojiChange}
                  />
                  <Input
                    value={formData.personName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, personName: e.target.value }))
                    }
                    placeholder="Contoh: Bank BCA, Pak Andi"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jumlah Hutang</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      Rp
                    </span>
                    <Input
                      value={formData.actualAmount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          actualAmount: formatNumber(e.target.value),
                        }))
                      }
                      placeholder="5.000.000"
                      className="pl-10"
                      disabled={!isNew}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipe Pembayaran</Label>
                  <Select
                    value={formData.paymentType}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, paymentType: value }))
                    }
                    disabled={!isNew}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.paymentType === "INSTALLMENT" && (
                <div className="space-y-2">
                  <Label>Tenor (Bulan)</Label>
                  <Input
                    type="number"
                    value={formData.tenor}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, tenor: e.target.value }))
                    }
                    placeholder="12"
                    min="1"
                    disabled={!isNew}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Tanggal Jatuh Tempo</Label>
                <DatePicker
                  value={formData.dueDate}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, dueDate: value }))
                  }
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

          <div className="md:static md:mt-6 p-5 pb-8 md:rounded-lg md:border fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-x border-border bg-card">
            {isNew ? (
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {formData.paymentType === "INSTALLMENT" ? "Cicilan per bulan" : "Total bayar"}
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {formatIDR(monthlyPayment)}
                  </p>
                </div>
                <Button type="submit" form="debt-form" className="w-fit" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Simpan
                </Button>
              </div>
            ) : debt?.status === "ACTIVE" && (
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {debt.paymentType === "INSTALLMENT" ? "Cicilan Bulanan" : "Sisa Hutang"}
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {formatIDR(debt.paymentType === "INSTALLMENT" ? (debt.monthlyPayment || 0) : debt.remainingAmount)}
                  </p>
                </div>
                <Button
                  className="w-fit bg-green-600 text-primary hover:bg-green-700"
                  type="button"
                  onClick={() => setIsPaymentOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Bayar Hutang
                </Button>
              </div>
            )}
          </div>
        </form>
      )}
    </div>

    {/* Floating Action Button - Mobile Only */}
    {!isNew && debt?.status === "ACTIVE" && (
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
                <span>Tandai Lunas</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )}
    </>
  );
}
