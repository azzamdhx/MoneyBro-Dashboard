"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HighlightCard } from "@/components/ui/highlight-card";
import { formatIDR } from "@/lib/utils/currency";
import { GET_DASHBOARD } from "@/lib/graphql/queries";
import {
  TrendUp,
  Receipt as PhReceipt,
  CreditCard as PhCreditCard,
  Wallet as PhWallet,
  PiggyBank as PhPiggyBank,
  ChartLineUp,
  ClockCounterClockwise,
  DotsNine,
  ArrowsClockwise,
  FileText,
  X,
} from "@phosphor-icons/react";
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
      icon: string | null;
      cardBgColor: string | null;
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
  const [moreOpen, setMoreOpen] = useState(false);
  

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
    (balanceSummary?.totalDebtPayment || 0) +
    (dashboard?.totalSavingsContributionThisMonth || 0);

  const totalIncome = balanceSummary?.totalIncome || 0;
  const netBalance = totalIncome - totalOutflow;
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
      <div className="mb-4">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground hidden sm:block">Overview keuangan bulan ini</p>
      </div>

      {/* Net Balance Hero Card */}
      <HighlightCard
        gradientColor={getBalanceGradientBg()}
        balanceLabel={
          <p className="text-xs sm:text-sm font-medium text-white/70 hidden sm:block">Saldo Bersih Bulan Ini</p>
        }
        balanceValue={
          <h1 className={`text-xl md:text-3xl font-bold ${getBalanceColor()} break-all sm:mt-1`}>
            {formatIDR(netBalance)}
          </h1>
        }
        chip={<ValueChip value={balancePercentage} showPercentage />}
        breakdown={
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-0.5 text-center md:text-start">
              <p className="text-xs sm:text-xs text-white/70">Credit</p>
              <p className="text-xs sm:text-base font-semibold text-white break-all">{formatIDR(totalIncome)}</p>
            </div>
            <div className="space-y-0.5 text-center md:text-start">
              <p className="text-xs sm:text-xs text-white/70">Debit</p>
              <p className="text-xs sm:text-base font-semibold text-white break-all">{formatIDR(totalOutflow)}</p>
            </div>
          </div>
        }
      />

      {/* Mobile Menu Grid */}
      <div className="grid grid-cols-4 gap-4 md:hidden bg-card p-4 rounded-2xl border-1 border-border">
        {[
          { href: "/incomes", icon: TrendUp, label: "Pemasukan", color: "text-income" },
          { href: "/expenses", icon: PhReceipt, label: "Pengeluaran", color: "text-expense" },
          { href: "/installments", icon: PhCreditCard, label: "Cicilan", color: "text-installment" },
          { href: "/debts", icon: PhWallet, label: "Hutang", color: "text-debt" },
          { href: "/savings", icon: PhPiggyBank, label: "Tabungan", color: "text-savings" },
          { href: "/forecast", icon: ChartLineUp, label: "Forecast", color: "text-primary" },
          { href: "/history", icon: ClockCounterClockwise, label: "History", color: "text-primary" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1.5"
          >
            <div
              className="flex flex-col items-center py-3 w-full rounded-xl bg-background"
            >
              <item.icon size={24}/>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground text-center">{item.label}</span>
          </Link>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-1.5"
        >
          <div className="flex flex-col items-center py-3 w-full rounded-xl bg-background">
            <DotsNine size={24} className="text-muted-foreground" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground text-center">Lainnya</span>
        </button>
      </div>

      {/* More Modal */}
      {moreOpen && (
        <div className="fixed inset-0 z-90 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="border-t absolute bottom-0 left-0 right-0 h-[70vh] bg-background rounded-t-2xl p-6 animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Lainnya</h2>
              <button onClick={() => setMoreOpen(false)} className="p-1 rounded-full hover:bg-muted">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { href: "/recurring-incomes", icon: ArrowsClockwise, label: "Pemasukan Tetap", color: "text-income" },
                { href: "/expense-templates", icon: FileText, label: "Template Pengeluaran", color: "text-expense" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className="flex flex-col items-center py-3 w-full rounded-xl bg-card">
                    <item.icon size={24} />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground text-center">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Monthly Cash Flow Cards Mobile */}
      <div className="grid grid-cols-2 gap-4 md:hidden">
        <Link href="/incomes">
          <Card className="h-full transition-colors hover:bg-muted/50 py-4 gap-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4">
              <CardTitle className="text-xs font-medium">Pemasukan</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="text-sm font-bold text-income break-all">
                {formatIDR(balanceSummary?.totalIncome || 0)}
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/expenses">
          <Card className="h-full transition-colors hover:bg-muted/50 py-4 gap-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4">
              <CardTitle className="text-xs font-medium">Pengeluaran</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="text-sm font-bold text-expense break-all">
                {formatIDR(balanceSummary?.totalExpense || 0)}
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/installments">
          <Card className="h-full transition-colors hover:bg-muted/50 py-4 gap-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4">
              <CardTitle className="text-xs font-medium">Cicilan</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="text-sm font-bold text-installment break-all">
                {formatIDR(balanceSummary?.totalInstallmentPayment || 0)}
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/debts">
          <Card className="h-full transition-colors hover:bg-muted/50 py-4 gap-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4">
              <CardTitle className="text-xs font-medium">Hutang</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="text-sm font-bold text-debt break-all">
                {formatIDR(balanceSummary?.totalDebtPayment || 0)}
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/savings" className="col-span-2">
          <Card className="h-full transition-colors hover:bg-muted/50 py-4 gap-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4">
              <CardTitle className="text-xs font-medium">Tabungan</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="text-sm font-bold text-savings break-all">
                {formatIDR(dashboard?.totalSavingsContributionThisMonth || 0)}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Monthly Cash Flow Cards Desktop */}
      <div className="hidden md:block space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Link href="/incomes">
            <Card className="h-full transition-colors hover:bg-muted/50 py-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg font-medium">Pemasukan</CardTitle>
              </CardHeader>
              <CardContent className="px-6">
                <div className="text-xl font-bold text-income">
                  {formatIDR(balanceSummary?.totalIncome || 0)}
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/expenses">
            <Card className="h-full transition-colors hover:bg-muted/50 py-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg font-medium">Pengeluaran</CardTitle>
              </CardHeader>
              <CardContent className="px-6">
                <div className="text-xl font-bold text-expense">
                  {formatIDR(balanceSummary?.totalExpense || 0)}
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Link href="/installments">
            <Card className="h-full transition-colors hover:bg-muted/50 py-6 gap-4">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg font-medium">Cicilan</CardTitle>
              </CardHeader>
              <CardContent className="px-6">
                <div className="text-xl font-bold text-installment">
                  {formatIDR(balanceSummary?.totalInstallmentPayment || 0)}
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/debts">
            <Card className="h-full transition-colors hover:bg-muted/50 py-6 gap-4">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg font-medium">Hutang</CardTitle>
              </CardHeader>
              <CardContent className="px-6">
                <div className="text-xl font-bold text-debt">
                  {formatIDR(balanceSummary?.totalDebtPayment || 0)}
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/savings">
            <Card className="h-full transition-colors hover:bg-muted/50 py-6 gap-4">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lgfont-medium">Tabungan</CardTitle>
              </CardHeader>
              <CardContent className="px-6">
                <div className="text-xl font-bold text-savings">
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
