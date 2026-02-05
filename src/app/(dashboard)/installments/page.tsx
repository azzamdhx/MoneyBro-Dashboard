"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils/currency";
import { GET_INSTALLMENTS } from "@/lib/graphql/queries";
import { Plus, CreditCard, CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

  const installments: Installment[] = data?.installments || [];
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cicilan</h1>
          <p className="text-muted-foreground">Kelola cicilan kamu</p>
        </div>
        <Button asChild className="w-fit">
          <Link href="/installments/new">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Cicilan
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-card border-1">
          <CardHeader>
            <CardTitle className="flex flex-col gap-4 items-start">
              <span className="text-primary">Cicilan Bulanan</span>
              <span className="text-2xl text-installment">{formatIDR(totalMonthlyPayment)}</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {activeInstallments.length} cicilan aktif
            </p>
          </CardHeader>
        </Card>

        <Card className="bg-card border-1">
          <CardHeader>
            <CardTitle className="flex flex-col gap-4 items-start">
              <span className="text-primary">Sisa Cicilan</span>
              <span className="text-2xl text-installment">{formatIDR(totalRemainingAmount)}</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
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
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {activeInstallments.map((installment) => (
                  <Card
                    key={installment.id}
                    className="cursor-pointer hover:border-accent transition-colors py-0"
                    onClick={() => router.push(`/installments/${installment.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex mb-2">
                        <div className="h-8 w-8 rounded-lg bg-installment/10 flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-installment" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-semibold">{installment.name}</h3>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <span className="text-sm text-muted-foreground">
                              {installment.paidCount}/{installment.tenor} bulan
                            </span>
                            <span className="text-xs text-muted-foreground">
                              · Tanggal {installment.dueDay}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-installment">
                            {formatIDR(installment.monthlyPayment)}/bln
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Sisa {formatIDR(installment.remainingAmount)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
                        <div className="h-8 w-8 rounded-lg bg-income/10 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-income" />
                        </div>
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
  );
}
