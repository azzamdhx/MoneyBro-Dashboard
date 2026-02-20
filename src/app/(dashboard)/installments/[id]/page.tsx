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
  CREATE_INSTALLMENT,
  UPDATE_INSTALLMENT,
  DELETE_INSTALLMENT,
  RECORD_INSTALLMENT_PAYMENT,
  MARK_INSTALLMENT_COMPLETE,
} from "@/lib/graphql/mutations";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus, CheckCircle2, Trash2, X } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { getInstallmentEmoji, setInstallmentEmoji } from "@/lib/utils/emoji-storage";

const GET_INSTALLMENT = gql`
  query GetInstallment($id: UUID!) {
    installment(id: $id) {
      id
      name
      actualAmount
      loanAmount
      monthlyPayment
      tenor
      paidCount
      startDate
      dueDay
      status
      notes
      createdAt
      interestAmount
      interestPercentage
      remainingPayments
      remainingAmount
      payments {
        id
        paymentNumber
        amount
        paidAt
      }
    }
  }
`;

interface InstallmentPayment {
  id: string;
  paymentNumber: number;
  amount: number;
  paidAt: string;
}

interface Installment {
  id: string;
  name: string;
  actualAmount: number;
  loanAmount: number;
  monthlyPayment: number;
  tenor: number;
  paidCount: number;
  startDate: string;
  dueDay: number;
  status: string;
  notes: string | null;
  interestAmount: number;
  interestPercentage: number;
  remainingPayments: number;
  remainingAmount: number;
  payments: InstallmentPayment[];
}

interface InstallmentData {
  installment: Installment;
}

const formatNumber = (value: string): string => {
  const num = value.replace(/\D/g, "");
  return num ? formatNumberID(parseInt(num)) : "";
};

const parseNumber = (value: string): number => {
  return parseInt(value.replace(/\D/g, "")) || 0;
};

export default function InstallmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [emoji, setEmoji] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    actualAmount: "",
    tenor: "",
    dueDay: "1",
    startDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const { data: installmentData, loading: loadingInstallment, refetch } = useQuery<InstallmentData>(
    GET_INSTALLMENT,
    {
      variables: { id },
      skip: isNew,
    }
  );

  const installment = installmentData?.installment;

  useEffect(() => {
    if (installment) {
      setFormData({
        name: installment.name,
        actualAmount: formatNumberID(installment.actualAmount),
        tenor: installment.tenor.toString(),
        dueDay: installment.dueDay.toString(),
        startDate: installment.startDate?.slice(0, 10) || "",
        notes: installment.notes || "",
      });
      setEmoji(getInstallmentEmoji(installment.id));
    }
  }, [installment]);

  const handleEmojiChange = (newEmoji: string) => {
    setEmoji(newEmoji);
    if (!isNew && id) {
      setInstallmentEmoji(id, newEmoji);
    }
  };

  const [createInstallment, { loading: creating }] = useMutation(CREATE_INSTALLMENT, {
    onCompleted: (data) => {
      const newId = (data as { createInstallment: { id: string } }).createInstallment.id;
      if (emoji && newId) {
        setInstallmentEmoji(newId, emoji);
      }
      toast.success("Cicilan berhasil ditambahkan");
      router.push("/installments");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [updateInstallment, { loading: updating }] = useMutation(UPDATE_INSTALLMENT, {
    onCompleted: () => {
      toast.success("Cicilan berhasil diperbarui");
      router.push("/installments");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [deleteInstallment, { loading: deleting }] = useMutation(DELETE_INSTALLMENT, {
    onCompleted: () => {
      toast.success("Cicilan berhasil dihapus");
      router.push("/installments");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [recordPayment, { loading: recordingPayment }] = useMutation(RECORD_INSTALLMENT_PAYMENT, {
    onCompleted: () => {
      toast.success("Pembayaran berhasil dicatat");
      setIsPaymentOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [markComplete, { loading: markingComplete }] = useMutation(MARK_INSTALLMENT_COMPLETE, {
    onCompleted: () => {
      toast.success("Cicilan ditandai lunas");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.actualAmount || !formData.tenor) {
      toast.error("Mohon lengkapi nama, jumlah, dan tenor");
      return;
    }

    const input = {
      name: formData.name,
      actualAmount: parseNumber(formData.actualAmount),
      loanAmount: parseNumber(formData.actualAmount),
      monthlyPayment: Math.ceil(parseNumber(formData.actualAmount) / parseInt(formData.tenor)),
      tenor: parseInt(formData.tenor),
      dueDay: parseInt(formData.dueDay),
      startDate: formData.startDate ? toRFC3339(formData.startDate) : null,
      notes: formData.notes || null,
    };

    if (isNew) {
      createInstallment({ variables: { input } });
    } else {
      updateInstallment({ variables: { id, input } });
    }
  };

  const handleDelete = () => {
    deleteInstallment({ variables: { id } });
  };

  const handleRecordPayment = () => {
    if (!installment) return;
    recordPayment({
      variables: {
        input: {
          installmentId: id,
          amount: installment.monthlyPayment,
          paidAt: toRFC3339(new Date().toISOString()),
        },
      },
    });
  };

  const isLoading = creating || updating || deleting;
  const monthlyPayment = Math.ceil(parseNumber(formData.actualAmount) / (parseInt(formData.tenor) || 1));

  if (!isNew && loadingInstallment) {
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
                {isNew ? "Tambah Cicilan" : installment?.name}
              </h1>
              <p className="text-muted-foreground hidden sm:block">
                {isNew ? "Catat cicilan baru" : "Detail cicilan"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {(isNew || installment?.status === "ACTIVE") && (
            <Button type="submit" form="installment-form" className="w-fit hidden md:inline-flex" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isNew ? "Simpan" : "Perbarui"}
            </Button>
          )}
          {!isNew && installment?.status === "ACTIVE" && (
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
                title="Hapus Cicilan"
                description="Apakah kamu yakin ingin menghapus cicilan ini? Semua riwayat pembayaran juga akan dihapus."
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
            <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-card rounded-lg">
              <p className="text-sm text-primary">Jumlah Pembayaran</p>
              <p className="text-2xl font-bold text-income">
                {formatIDR(installment?.monthlyPayment || 0)}
              </p>
              <p className="text-sm text-primary mt-2">
                Pembayaran ke-{(installment?.paidCount || 0) + 1} dari {installment?.tenor}
              </p>
            </div>
            <Button
              className="w-full bg-primary text-background"
              onClick={handleRecordPayment}
              disabled={recordingPayment}
            >
              {recordingPayment && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Konfirmasi Pembayaran
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!isNew && installment && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">Cicilan Bulanan</p>
              <p className="text-2xl font-bold text-primary">
                {formatIDR(installment.monthlyPayment)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold">
                {installment.paidCount}/{installment.tenor}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">Sisa Cicilan</p>
              <p className="text-2xl font-bold text-destructive">
                {formatIDR(installment.remainingAmount)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">Jatuh Tempo</p>
              <p className="text-2xl font-bold">Tanggal {installment.dueDay}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {!isNew && installment && installment.payments.length > 0 && (
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
                {installment.payments.map((payment) => (
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

      {(isNew || installment?.status === "ACTIVE") && (
        <form id="installment-form" onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>{isNew ? "Detail Cicilan" : "Edit Cicilan"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Cicilan</Label>
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
                    placeholder="Contoh: Kredit Motor Honda"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Pinjaman</Label>
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
                      placeholder="15.000.000"
                      className="pl-10"
                      disabled={!isNew}
                    />
                  </div>
                </div>

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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tanggal Jatuh Tempo</Label>
                  <Input
                    type="number"
                    value={formData.dueDay}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, dueDay: e.target.value }))
                    }
                    placeholder="1"
                    min="1"
                    max="31"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Mulai</Label>
                  <DatePicker
                    value={formData.startDate}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, startDate: value }))
                    }
                    disabled={!isNew}
                    className="w-full"
                  />
                </div>
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
                  <p className="text-sm text-muted-foreground">Cicilan per bulan</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatIDR(monthlyPayment)}
                  </p>
                </div>
                <Button type="submit" form="installment-form" className="w-fit" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Simpan
                </Button>
              </div>
            ) : installment?.status === "ACTIVE" && (
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cicilan Bulanan</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatIDR(installment?.monthlyPayment || 0)}
                  </p>
                </div>
                <Button
                  className="w-fit bg-green-600 text-primary hover:bg-green-700"
                  type="button"
                  onClick={() => setIsPaymentOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Bayar Cicilan
                </Button>
              </div>
            )}
          </div>
        </form>
      )}
    </div>

    {/* Floating Action Button - Mobile Only */}
    {!isNew && installment?.status === "ACTIVE" && (
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
