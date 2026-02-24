"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils/currency";
import { GET_INSTALLMENTS } from "@/lib/graphql/queries";
import { Plus, CreditCard, CheckCircle2, Clock, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getContrastStyles } from "@/lib/utils/color";

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
  icon: string | null;
  cardBgColor: string | null;
  notes: string | null;
  createdAt: string;
  interestAmount: number;
  interestPercentage: number;
  remainingPayments: number;
  remainingAmount: number;
  payments: InstallmentPayment[];
}

interface InstallmentsData {
  installments: Installment[];
}

export default function InstallmentsPage() {
  const router = useRouter();
  const { data, loading } = useQuery<InstallmentsData>(GET_INSTALLMENTS);
  const [emojis, setEmojis] = useState<Record<string, string>>({});

  const installments: Installment[] = data?.installments || [];

  useEffect(() => {
    const items = data?.installments || [];
    if (items.length > 0) {
      const map: Record<string, string> = {};
      items.forEach((i) => {
        if (i.icon) map[i.id] = i.icon;
      });
      setEmojis(map);
    }
  }, [data]);
  const activeInstallments = installments.filter((i) => i.status === "ACTIVE");
  const completedInstallments = installments.filter((i) => i.status === "COMPLETED");

  const totalMonthlyPayment = activeInstallments.reduce(
    (sum, i) => sum + i.monthlyPayment,
    0
  );
  const totalRemainingAmount = activeInstallments.reduce(
    (sum, i) => sum + i.remainingAmount,
    0
  );

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Cicilan</h1>
            <p className="text-muted-foreground hidden sm:block">Kelola cicilan kamu</p>
          </div>
        </div>
        <Button asChild className="w-fit hidden md:inline-flex">
          <Link href="/installments/new">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Cicilan
          </Link>
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 sm:overflow-visible">
        <Card className="bg-card border-1 min-w-[90%] shrink-0 sm:min-w-0">
          <CardHeader>
            <CardTitle className="flex flex-col gap-4 items-start">
              <span className="text-primary">Cicilan Bulanan</span>
              <span className="text-xl text-installment">{formatIDR(totalMonthlyPayment)}</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {activeInstallments.length} cicilan aktif
            </p>
          </CardHeader>
        </Card>

        <Card className="bg-card border-1 min-w-[90%] shrink-0 sm:min-w-0">
          <CardHeader>
            <CardTitle className="flex flex-col gap-4 items-start">
              <span className="text-primary">Sisa Cicilan</span>
              <span className="text-xl text-installment">{formatIDR(totalRemainingAmount)}</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Total yang harus dilunasi
            </p>
          </CardHeader>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <div className="grid gap-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-lg" />
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <Skeleton className="h-5 w-28 ml-auto" />
                        <Skeleton className="h-4 w-24 ml-auto" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : installments.length > 0 ? (
        <div className="space-y-6">
          {activeInstallments.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-installment" />
                Cicilan Aktif ({activeInstallments.length})
              </h2>
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {activeInstallments.map((installment) => {
                  const c = getContrastStyles(installment.cardBgColor);
                  return (
                  <Card
                    key={installment.id}
                    className="cursor-pointer hover:border-accent transition-colors py-0"
                    onClick={() => router.push(`/installments/${installment.id}`)}
                    style={installment.cardBgColor ? { backgroundColor: installment.cardBgColor, borderColor: installment.cardBgColor } : undefined}
                  >
                    <CardContent className="p-4">
                      <div className="flex mb-2">
                        {emojis[installment.id] ? (
                          <span className="text-2xl">{emojis[installment.id]}</span>
                        ) : (
                          <CreditCard className={cn("h-5 w-5", c.bold || "text-installment")} />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div>
                          <h3 className={cn("font-semibold", c.text)}>{installment.name}</h3>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <span className={cn("text-sm", c.muted)}>
                              {installment.paidCount}/{installment.tenor} bulan
                            </span>
                            <span className={cn("text-xs", c.muted)}>
                              · Tanggal {installment.dueDay}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className={cn("font-bold", c.bold || "text-installment")}>
                            {formatIDR(installment.monthlyPayment)}
                          </p>
                          <p className={cn("text-xs mt-1", c.muted)}>
                            Sisa {formatIDR(installment.remainingAmount)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            </div>
          )}

          {completedInstallments.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-income" />
                Cicilan Selesai ({completedInstallments.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {completedInstallments.map((installment) => (
                  <Card
                    key={installment.id}
                    className="cursor-pointer hover:border-accent transition-colors opacity-70 py-0"
                    onClick={() => router.push(`/installments/${installment.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex mb-2">
                        {emojis[installment.id] ? (
                          <span className="text-2xl">{emojis[installment.id]}</span>
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-income" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-semibold">{installment.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Lunas · {installment.tenor} bulan
                          </p>
                        </div>
                        <div>
                          <p className="font-bold text-income">Lunas</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Total {formatIDR(installment.actualAmount)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <CreditCard className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">Belum ada cicilan</p>
            <p className="text-xs mt-1">
              Klik tombol Tambah Cicilan untuk mencatat cicilan baru
            </p>
          </CardContent>
        </Card>
      )}
    </div>

    {/* Floating Action Button - Mobile Only */}
    <div className="fixed bottom-10 right-6 z-[60] md:hidden">
      <Link
        href="/installments/new"
        className="flex items-center justify-center w-14 h-14 rounded-full shadow-lg bg-primary text-primary-foreground"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
    </>
  );
}
