"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HighlightCard } from "@/components/ui/highlight-card";
import { formatIDR } from "@/lib/utils/currency";
import { GET_DASHBOARD } from "@/lib/graphql/queries";
import {
  Wallet,
  Receipt,
  CreditCard,
  BadgeDollarSign,
  PiggyBank,
} from "lucide-react";
import { ValueChip } from "@/components/ui/value-chip";
import { Skeleton } from "@/components/ui/skeleton";

const LazyCharts = dynamic(() => import("@/components/dashboard-charts"), {
  loading: () => (
    <div className="grid gap-4 md:grid-cols-2">
      {[...Array(2)].map((_, i) => (
        <Card key={i}>
          <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
          <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
        </Card>
      ))}
    </div>
  ),
  ssr: false,
});


interface BalanceSummary {
  totalIncome: number;
  totalExpense: number;
  totalInstallmentPayment: number;
  totalDebtPayment: number;
  netBalance: number;
  status: "SURPLUS" | "DEFICIT" | "BALANCED";
}

interface DashboardData {
  dashboard: {
    totalActiveDebt: number;
    totalActiveInstallment: number;
    totalExpenseThisMonth: number;
    totalIncomeThisMonth: number;
    balanceSummary: BalanceSummary;
    expensesByCategory: {
      category: { id: string; name: string };
      totalAmount: number;
      expenseCount: number;
    }[];
    totalSavingsContributionThisMonth: number;
    activeSavingsGoals: {
      id: string;
      name: string;
      targetAmount: number;
      currentAmount: number;
      targetDate: string;
      progress: number;
      remainingAmount: number;
      monthlyTarget: number;
    }[];
    recentExpenses: {
      id: string;
      itemName: string;
      total: number;
      expenseDate: string;
      category: { name: string };
    }[];
  };
}


export default function DashboardPage() {
  const { data, loading, error } = useQuery<DashboardData>(GET_DASHBOARD);
  

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Hero Card Skeleton */}
        <Skeleton className="h-[180px] w-full rounded-lg" />

        {/* 4 Cards Grid Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 2 Cards Grid Skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-40 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Grid Skeleton */}
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Expenses Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="space-y-2 text-right">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Error: {error.message}</p>
      </div>
    );
  }

  const dashboard = data?.dashboard;
  const balanceSummary = dashboard?.balanceSummary;
  
  const categoryData = dashboard?.expensesByCategory.map((item, index) => ({
    name: item.category.name,
    value: item.totalAmount,
    fill: `url(#gradient-${index})`,
    gradientId: `gradient-${index}`,
    gradientColors: [
      ["#667eea", "#764ba2"],
      ["#f093fb", "#f5576c"],
      ["#4facfe", "#00f2fe"],
      ["#43e97b", "#38f9d7"],
      ["#fa709a", "#fee140"],
      ["#30cfd0", "#330867"],
      ["#a8edea", "#fed6e3"],
      ["#ff9a9e", "#fecfef"],
    ][index % 8],
  })) || [];


  const totalOutflow = (balanceSummary?.totalExpense || 0) +
    (balanceSummary?.totalInstallmentPayment || 0) +
    (balanceSummary?.totalDebtPayment || 0);

  const totalIncome = balanceSummary?.totalIncome || 0;
  const netBalance = balanceSummary?.netBalance || 0;
  const balancePercentage = totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : 0;

  const cashFlowData = [
    {
      name: "Pemasukan",
      value: balanceSummary?.totalIncome || 0,
      fill: "url(#gradient-income)",
      gradientColors: ["#43e97b", "#38f9d7"]
    },
    {
      name: "Pengeluaran",
      value: balanceSummary?.totalExpense || 0,
      fill: "url(#gradient-expense)",
      gradientColors: ["#fa709a", "#fee140"]
    },
    {
      name: "Bayar Cicilan",
      value: balanceSummary?.totalInstallmentPayment || 0,
      fill: "url(#gradient-payment-installment)",
      gradientColors: ["#667eea", "#764ba2"]
    },
    {
      name: "Bayar Hutang",
      value: balanceSummary?.totalDebtPayment || 0,
      fill: "url(#gradient-payment-debt)",
      gradientColors: ["#f093fb", "#f5576c"]
    }
  ];

  const getBalanceGradientBg = () => {
    if (!balanceSummary) return "bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800";
    // Use netBalance value instead of status
    if (netBalance > 0) {
      return "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600";
    } else if (netBalance < 0) {
      return "bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600";
    } else {
      return "bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500";
    }
  };
  
  const getBalanceColor = () => {
    return "text-white";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview keuangan bulan ini</p>
      </div>

      {/* Net Balance Hero Card */}
      <HighlightCard
        gradientColor={getBalanceGradientBg()}
        balanceLabel={
          <p className="text-xs sm:text-sm font-medium text-white/70">Saldo Bersih Bulan Ini</p>
        }
        balanceValue={
          <p className={`text-2xl sm:text-3xl md:text-4xl font-bold ${getBalanceColor()} break-all mt-1`}>
            {formatIDR(netBalance)}
          </p>
        }
        chip={<ValueChip value={balancePercentage} showPercentage />}
        breakdown={
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-0.5">
              <p className="text-[10px] sm:text-xs text-white/70">Credit</p>
              <p className="text-sm sm:text-base font-semibold text-white break-all">{formatIDR(totalIncome)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] sm:text-xs text-white/70">Debit</p>
              <p className="text-sm sm:text-base font-semibold text-white break-all">{formatIDR(totalOutflow)}</p>
            </div>
          </div>
        }
      />

      {/* Monthly Cash Flow Cards — single scroll row on mobile, 2-col + 3-col grid on desktop */}
      <div className="flex gap-4 overflow-x-auto pb-2 md:hidden">
        <Link href="/incomes" className="min-w-[200px] flex-shrink-0">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pemasukan</CardTitle>
              <BadgeDollarSign className="h-4 w-4 text-income" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-income">
                {formatIDR(balanceSummary?.totalIncome || 0)}
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/expenses" className="min-w-[200px] flex-shrink-0">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pengeluaran</CardTitle>
              <Wallet className="h-4 w-4 text-expense" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-expense">
                {formatIDR(balanceSummary?.totalExpense || 0)}
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/installments" className="min-w-[200px] flex-shrink-0">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cicilan</CardTitle>
              <CreditCard className="h-4 w-4 text-installment" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-installment">
                {formatIDR(balanceSummary?.totalInstallmentPayment || 0)}
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/debts" className="min-w-[200px] flex-shrink-0">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hutang</CardTitle>
              <Receipt className="h-4 w-4 text-debt" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-debt">
                {formatIDR(balanceSummary?.totalDebtPayment || 0)}
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/savings" className="min-w-[200px] flex-shrink-0">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tabungan</CardTitle>
              <PiggyBank className="h-4 w-4 text-savings" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-savings">
                {formatIDR(dashboard?.totalSavingsContributionThisMonth || 0)}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="hidden md:block space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Link href="/incomes">
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pemasukan</CardTitle>
                <BadgeDollarSign className="h-4 w-4 text-income" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-income">
                  {formatIDR(balanceSummary?.totalIncome || 0)}
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/expenses">
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pengeluaran</CardTitle>
                <Wallet className="h-4 w-4 text-expense" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-expense">
                  {formatIDR(balanceSummary?.totalExpense || 0)}
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Link href="/installments">
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cicilan</CardTitle>
                <CreditCard className="h-4 w-4 text-installment" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-installment">
                  {formatIDR(balanceSummary?.totalInstallmentPayment || 0)}
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/debts">
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hutang</CardTitle>
                <Receipt className="h-4 w-4 text-debt" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-debt">
                  {formatIDR(balanceSummary?.totalDebtPayment || 0)}
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/savings">
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tabungan</CardTitle>
                <PiggyBank className="h-4 w-4 text-savings" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-savings">
                  {formatIDR(dashboard?.totalSavingsContributionThisMonth || 0)}
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
      {/* Charts — lazy loaded */}
      <LazyCharts
        cashFlowData={cashFlowData}
        categoryData={categoryData}
      />
    </div>
  );
}
