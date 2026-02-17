"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HighlightCard } from "@/components/ui/highlight-card";
import { formatIDR } from "@/lib/utils/currency";
import { formatMonthYear } from "@/lib/utils/format";
import { GET_FORECAST_SUMMARY } from "@/lib/graphql/queries";
import {
  Wallet,
  BarChart3,
  Receipt,
  CreditCard,
  BadgeDollarSign,
  PiggyBank,
  TrendingUp,
  CalendarClock,
} from "lucide-react";
import { ValueChip } from "@/components/ui/value-chip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ForecastSummaryData {
  forecastSummary: {
    availableMonths: string[];
    selectedMonth: string;
    incomeSummary: {
      total: number;
      count: number;
      byCategory: {
        category: { id: string; name: string };
        totalAmount: number;
        count: number;
      }[];
      byType: {
        incomeType: string;
        totalAmount: number;
        count: number;
      }[];
    };
    expenseSummary: {
      total: number;
      count: number;
      byCategory: {
        category: { id: string; name: string };
        totalAmount: number;
        count: number;
      }[];
    };
    payments: {
      installments: {
        installmentId: string;
        name: string;
        monthlyPayment: number;
        dueDay: number;
        dueDate: string;
        remainingAmount: number;
        remainingPayments: number;
      }[];
      debts: {
        debtId: string;
        personName: string;
        monthlyPayment: number;
        dueDate: string;
        remainingAmount: number;
        paymentType: string;
      }[];
      totalInstallment: number;
      totalDebt: number;
      totalPayments: number;
    };
    totalSavingsContribution: number;
  };
}

function parseMonthKey(monthKey: string): { month: number; year: number } | null {
  if (!monthKey) return null;
  const [year, month] = monthKey.split("-").map(Number);
  if (isNaN(year) || isNaN(month)) return null;
  return { month, year };
}

export default function ForecastPage() {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const parsed = selectedMonth ? parseMonthKey(selectedMonth) : null;

  const { data, loading } = useQuery<ForecastSummaryData>(GET_FORECAST_SUMMARY, {
    variables: parsed ? { filter: { month: parsed.month, year: parsed.year } } : {},
  });

  const summary = data?.forecastSummary;
  const availableMonths = summary?.availableMonths || [];

  // Sync selectedMonth with backend's selectedMonth on first load
  if (!selectedMonth && summary?.selectedMonth) {
    setSelectedMonth(summary.selectedMonth);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-[180px] w-full rounded-lg" />
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
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
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
      </div>
    );
  }

  if (availableMonths.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Forecast</h1>
            <p className="text-muted-foreground">Proyeksi keuangan bulan mendatang</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <CalendarClock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Belum ada data forecast</h3>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
              Tidak ada transaksi terjadwal di bulan-bulan mendatang. Tambahkan pemasukan atau pengeluaran dengan tanggal di masa depan.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const incomeSummary = summary?.incomeSummary;
  const expenseSummary = summary?.expenseSummary;
  const payments = summary?.payments;
  const currentMonth = selectedMonth || summary?.selectedMonth || "";

  const projectedInstallment = payments?.totalInstallment || 0;
  const projectedDebt = payments?.totalDebt || 0;
  const projectedExpense = expenseSummary?.total || 0;
  const projectedSavings = summary?.totalSavingsContribution || 0;

  const hasData = (incomeSummary?.total || 0) > 0 || projectedExpense > 0 || projectedInstallment > 0 || projectedDebt > 0 || projectedSavings > 0;

  const totalOutflow = projectedExpense + projectedInstallment + projectedDebt + projectedSavings;
  const totalIncome = incomeSummary?.total || 0;
  const netBalance = totalIncome - totalOutflow;
  const balancePercentage = totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : 0;

  const cashFlowData = [
    { name: "Pemasukan", value: totalIncome, fill: "url(#gradient-income)", gradientColors: ["#43e97b", "#38f9d7"] },
    { name: "Pengeluaran", value: projectedExpense, fill: "url(#gradient-expense)", gradientColors: ["#fa709a", "#fee140"] },
    { name: "Cicilan", value: projectedInstallment, fill: "url(#gradient-installment)", gradientColors: ["#667eea", "#764ba2"] },
    { name: "Hutang", value: projectedDebt, fill: "url(#gradient-debt)", gradientColors: ["#f093fb", "#f5576c"] },
  ];

  const expenseCategoryData = expenseSummary?.byCategory.map((item, index) => ({
    name: item.category.name,
    value: item.totalAmount,
    fill: `url(#gradient-expense-${index})`,
    gradientId: `gradient-expense-${index}`,
    gradientColors: [["#667eea","#764ba2"],["#f093fb","#f5576c"],["#4facfe","#00f2fe"],["#43e97b","#38f9d7"],["#fa709a","#fee140"],["#30cfd0","#330867"],["#a8edea","#fed6e3"],["#ff9a9e","#fecfef"]][index % 8],
  })) || [];

  const incomeCategoryData = incomeSummary?.byCategory.map((item, index) => ({
    name: item.category.name,
    value: item.totalAmount,
    fill: `url(#gradient-income-cat-${index})`,
    gradientId: `gradient-income-cat-${index}`,
    gradientColors: [["#43e97b","#38f9d7"],["#667eea","#764ba2"],["#4facfe","#00f2fe"],["#f093fb","#f5576c"],["#fa709a","#fee140"],["#30cfd0","#330867"],["#a8edea","#fed6e3"],["#ff9a9e","#fecfef"]][index % 8],
  })) || [];

  const upcomingPaymentsChartData = [
    ...(payments?.installments?.map((item, index) => ({
      name: item.name, value: item.monthlyPayment, type: "Cicilan",
      fill: `url(#gradient-upcoming-${index})`, gradientColors: ["#667eea", "#764ba2"],
    })) || []),
    ...(payments?.debts?.map((item, index) => ({
      name: item.personName, value: item.monthlyPayment || 0, type: "Hutang",
      fill: `url(#gradient-upcoming-debt-${index})`, gradientColors: ["#f093fb", "#f5576c"],
    })) || []),
  ].slice(0, 8);

  const getBalanceGradientBg = () => {
    if (!hasData) return "bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800";
    if (netBalance > 0) return "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600";
    if (netBalance < 0) return "bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600";
    return "bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Forecast</h1>
          </div>
        </div>
        <Select value={currentMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-fit">
            <SelectValue placeholder="Pilih bulan" />
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map((m) => (
              <SelectItem key={m} value={m}>
                {formatMonthYear(`${m}-01`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <CalendarClock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Belum ada data untuk {currentMonth ? formatMonthYear(`${currentMonth}-01`) : "bulan ini"}</h3>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
              Tambahkan pemasukan atau pengeluaran yang dijadwalkan untuk bulan ini untuk melihat proyeksi.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Net Balance Hero Card */}
          <HighlightCard
            gradientColor={getBalanceGradientBg()}
            balanceLabel={
              <p className="text-xs sm:text-sm font-medium text-white/70">
                Proyeksi {currentMonth ? formatMonthYear(`${currentMonth}-01`) : ""}
              </p>
            }
            balanceValue={
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white break-all mt-1">
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

          {/* Monthly Cash Flow Cards - Mobile: scroll row */}
          <div className="flex gap-4 overflow-x-auto pb-2 md:hidden">
            <Link href="/incomes" className="min-w-[200px] flex-shrink-0">
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pemasukan</CardTitle>
                  <BadgeDollarSign className="h-4 w-4 text-income" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-income">{formatIDR(incomeSummary?.total || 0)}</div>
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
                  <div className="text-2xl font-bold text-expense">{formatIDR(expenseSummary?.total || 0)}</div>
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
                  <div className="text-2xl font-bold text-installment">{formatIDR(payments?.totalInstallment || 0)}</div>
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
                  <div className="text-2xl font-bold text-debt">{formatIDR(payments?.totalDebt || 0)}</div>
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
                  <div className="text-2xl font-bold text-savings">{formatIDR(summary?.totalSavingsContribution || 0)}</div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Desktop: 2-col + 3-col grid */}
          <div className="hidden md:block space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Link href="/incomes">
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pemasukan</CardTitle>
                    <BadgeDollarSign className="h-4 w-4 text-income" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-income">{formatIDR(incomeSummary?.total || 0)}</div>
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
                    <div className="text-2xl font-bold text-expense">{formatIDR(expenseSummary?.total || 0)}</div>
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
                    <div className="text-2xl font-bold text-installment">{formatIDR(payments?.totalInstallment || 0)}</div>
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
                    <div className="text-2xl font-bold text-debt">{formatIDR(payments?.totalDebt || 0)}</div>
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
                    <div className="text-2xl font-bold text-savings">{formatIDR(summary?.totalSavingsContribution || 0)}</div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {/* Cash Flow Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Proyeksi Arus Kas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashFlowData}>
                      <defs>
                        {cashFlowData.map((entry, index) => (
                          <linearGradient key={`gradient-${index}`} id={entry.fill.replace('url(#', '').replace(')', '')} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={entry.gradientColors[0]} />
                            <stop offset="100%" stopColor={entry.gradientColors[1]} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                      <XAxis dataKey="name" stroke="#71717A" fontSize={12} />
                      <YAxis stroke="#71717A" fontSize={12} tickFormatter={(value) => `${value / 1000000}jt`} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: "#18181B", border: "1px solid #27272A", borderRadius: "8px", color: "#FFFFFF" }} itemStyle={{ color: "#FFFFFF" }} labelStyle={{ color: "#FFFFFF" }} formatter={(value) => [formatIDR(value as number), null]} />
                      <Bar dataKey="value" radius={[8, 8, 8, 8]} isAnimationActive={false}>
                        {cashFlowData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Expense Categories Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Kategori Pengeluaran</CardTitle>
              </CardHeader>
              <CardContent>
                {expenseCategoryData.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expenseCategoryData} layout="vertical">
                        <defs>
                          {expenseCategoryData.map((entry, index) => (
                            <linearGradient key={`gradient-${index}`} id={entry.gradientId} x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor={entry.gradientColors[0]} />
                              <stop offset="100%" stopColor={entry.gradientColors[1]} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                        <XAxis type="number" stroke="#71717A" fontSize={12} tickFormatter={(value) => `${value / 1000000}jt`} />
                        <YAxis type="category" dataKey="name" stroke="#71717A" fontSize={12} width={80} />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: "#18181B", border: "1px solid #27272A", borderRadius: "8px", color: "#FFFFFF" }} itemStyle={{ color: "#FFFFFF" }} labelStyle={{ color: "#FFFFFF" }} formatter={(value) => [formatIDR(value as number), null]} />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]} isAnimationActive={false}>
                          {expenseCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-sm">Tidak ada pengeluaran</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Income Categories Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Kategori Pemasukan</CardTitle>
              </CardHeader>
              <CardContent>
                {incomeCategoryData.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={incomeCategoryData} layout="vertical">
                        <defs>
                          {incomeCategoryData.map((entry, index) => (
                            <linearGradient key={`gradient-${index}`} id={entry.gradientId} x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor={entry.gradientColors[0]} />
                              <stop offset="100%" stopColor={entry.gradientColors[1]} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                        <XAxis type="number" stroke="#71717A" fontSize={12} tickFormatter={(value) => `${value / 1000000}jt`} />
                        <YAxis type="category" dataKey="name" stroke="#71717A" fontSize={12} width={80} />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: "#18181B", border: "1px solid #27272A", borderRadius: "8px", color: "#FFFFFF" }} itemStyle={{ color: "#FFFFFF" }} labelStyle={{ color: "#FFFFFF" }} formatter={(value) => [formatIDR(value as number), null]} />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]} isAnimationActive={false}>
                          {incomeCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-sm">Tidak ada pemasukan</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Payments Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Payments</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingPaymentsChartData.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={upcomingPaymentsChartData} layout="vertical">
                        <defs>
                          {upcomingPaymentsChartData.map((entry, index) => (
                            <linearGradient key={`gradient-${index}`} id={entry.fill.replace('url(#', '').replace(')', '')} x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor={entry.gradientColors[0]} />
                              <stop offset="100%" stopColor={entry.gradientColors[1]} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                        <XAxis type="number" stroke="#71717A" fontSize={12} tickFormatter={(value) => `${value / 1000000}jt`} />
                        <YAxis type="category" dataKey="name" stroke="#71717A" fontSize={12} width={100} />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: "#18181B", border: "1px solid #27272A", borderRadius: "8px", color: "#FFFFFF" }} itemStyle={{ color: "#FFFFFF" }} labelStyle={{ color: "#FFFFFF" }} formatter={(value) => [formatIDR(value as number), null]} />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]} isAnimationActive={false}>
                          {upcomingPaymentsChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-sm">Belum ada pembayaran</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
