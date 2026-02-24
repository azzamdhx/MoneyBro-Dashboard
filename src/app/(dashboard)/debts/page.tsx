"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils/currency";
import { formatDateShortID } from "@/lib/utils/format";
import { GET_DEBTS } from "@/lib/graphql/queries";
import { Plus, Wallet, CheckCircle2, Clock, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getContrastStyles } from "@/lib/utils/color";

interface DebtPayment {
  id: string;
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
  icon: string | null;
  cardBgColor: string | null;
  notes: string | null;
  createdAt: string;
  totalToPay: number;
  paidAmount: number;
  remainingAmount: number;
  interestAmount: number;
  interestPercentage: number;
  payments: DebtPayment[];
}

interface DebtsData {
  debts: Debt[];
}

const getPaymentTypeLabel = (type: string): string => {
  switch (type) {
    case "INSTALLMENT":
      return "Bulanan";
    case "ONE_TIME":
      return "Sekaligus";
    default:
      return type;
  }
};

export default function DebtsPage() {
  const router = useRouter();
  const { data, loading } = useQuery<DebtsData>(GET_DEBTS);
  const [emojis, setEmojis] = useState<Record<string, string>>({});

  const debts: Debt[] = data?.debts || [];

  useEffect(() => {
    const items = data?.debts || [];
    if (items.length > 0) {
      const map: Record<string, string> = {};
      items.forEach((d) => {
        if (d.icon) map[d.id] = d.icon;
      });
      setEmojis(map);
    }
  }, [data]);
  const activeDebts = debts.filter((d) => d.status === "ACTIVE");
  const paidDebts = debts.filter((d) => d.status === "COMPLETED");

  const totalMonthlyPayment = activeDebts
    .filter((d) => d.paymentType === "INSTALLMENT")
    .reduce((sum, d) => sum + (d.monthlyPayment || 0), 0);
  const totalRemainingAmount = activeDebts.reduce(
    (sum, d) => sum + d.remainingAmount,
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
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Hutang</h1>
            <p className="text-muted-foreground hidden sm:block">Kelola hutang kamu</p>
          </div>
        </div>
        <Button asChild className="w-fit hidden md:inline-flex">
          <Link href="/debts/new">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Hutang
          </Link>
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 sm:overflow-visible">
        <Card className="bg-card border-1 min-w-[90%] shrink-0 sm:min-w-0">
          <CardHeader>
            <CardTitle className="flex flex-col gap-4 items-start">
              <span className="text-primary">Cicilan Bulanan</span>
              <span className="text-lg sm:text-2xl text-debt">{formatIDR(totalMonthlyPayment)}</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {activeDebts.filter((d) => d.paymentType === "INSTALLMENT").length} hutang cicilan
            </p>
          </CardHeader>
        </Card>

        <Card className="bg-card border-1 min-w-[90%] shrink-0 sm:min-w-0">
          <CardHeader>
            <CardTitle className="flex flex-col gap-4 items-start">
              <span className="text-primary">Sisa Hutang</span>
              <span className="text-lg sm:text-2xl text-debt">{formatIDR(totalRemainingAmount)}</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {activeDebts.length} hutang aktif
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
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <Skeleton className="h-5 w-28 ml-auto" />
                        <Skeleton className="h-4 w-20 ml-auto" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : debts.length > 0 ? (
        <div className="space-y-6">
          {activeDebts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-debt" />
                Hutang Aktif ({activeDebts.length})
              </h2>
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {activeDebts.map((debt) => {
                  const c = getContrastStyles(debt.cardBgColor);
                  return (
                  <Card
                    key={debt.id}
                    className="cursor-pointer hover:border-accent transition-colors py-0"
                    onClick={() => router.push(`/debts/${debt.id}`)}
                    style={debt.cardBgColor ? { backgroundColor: debt.cardBgColor, borderColor: debt.cardBgColor } : undefined}
                  >
                    <CardContent className="p-4">
                      <div className="flex mb-2">
                        {emojis[debt.id] ? (
                          <span className="text-2xl">{emojis[debt.id]}</span>
                        ) : (
                          <Wallet className={cn("h-5 w-5", c.bold || "text-debt")} />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div>
                          <h3 className={cn("font-semibold", c.text)}>{debt.personName}</h3>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <span className={cn("text-sm", c.muted)}>
                              {getPaymentTypeLabel(debt.paymentType)}
                            </span>
                            {debt.dueDate && (
                              <span className={cn("text-xs", c.muted)}>
                                · {formatDateShortID(debt.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          {debt.paymentType === "INSTALLMENT" ? (
                            <>
                              <p className={cn("font-bold", c.bold || "text-debt")}>
                                {formatIDR(debt.monthlyPayment || 0)}/bln
                              </p>
                              <p className={cn("text-xs mt-1", c.muted)}>
                                Sisa {formatIDR(debt.remainingAmount)}
                              </p>
                            </>
                          ) : (
                            <p className={cn("font-bold", c.bold || "text-debt")}>
                              {formatIDR(debt.remainingAmount)}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            </div>
          )}

          {paidDebts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-income" />
                Hutang Lunas ({paidDebts.length})
              </h2>
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {paidDebts.map((debt) => (
                  <Card
                    key={debt.id}
                    className="cursor-pointer hover:border-accent transition-colors opacity-70 py-0"
                    onClick={() => router.push(`/debts/${debt.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex mb-2">
                        {emojis[debt.id] ? (
                          <span className="text-2xl">{emojis[debt.id]}</span>
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-income" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-semibold">{debt.personName}</h3>
                          <p className="text-sm text-muted-foreground">Lunas</p>
                        </div>
                        <div>
                          <p className="font-bold text-income">Lunas</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Total {formatIDR(debt.actualAmount)}
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
            <Wallet className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">Belum ada hutang</p>
            <p className="text-xs mt-1">
              Klik tombol Tambah Hutang untuk mencatat hutang baru
            </p>
          </CardContent>
        </Card>
      )}
    </div>

    {/* Floating Action Button - Mobile Only */}
    <div className="fixed bottom-10 right-6 z-[60] md:hidden">
      <Link
        href="/debts/new"
        className="flex items-center justify-center w-14 h-14 rounded-full shadow-lg bg-primary text-primary-foreground"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
    </>
  );
}
