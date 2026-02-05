"use client";

import { useQuery } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HighlightCard } from "@/components/ui/highlight-card";
import { formatIDR } from "@/lib/utils/currency";
import { GET_DASHBOARD, GET_UPCOMING_PAYMENTS } from "@/lib/graphql/queries";
import {
  Wallet,
  BarChart3,
  Receipt,
  CreditCard,
  BadgeDollarSign,
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
    upcomingInstallments: {
      id: string;
      name: string;
      monthlyPayment: number;
      dueDay: number;
      status: string;
      remainingAmount: number;
      remainingPayments: number;
    }[];
    upcomingDebts: {
      id: string;
      personName: string;
      actualAmount: number;
      remainingAmount: number;
      dueDate: string;
      status: string;
      paymentType: string;
      monthlyPayment: number;
    }[];
    expensesByCategory: {
      category: { id: string; name: string };
      totalAmount: number;
      expenseCount: number;
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

interface UpcomingPaymentsData {
  upcomingPayments: {
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
}

export default function DashboardPage() {
  const { data, loading, error } = useQuery<DashboardData>(GET_DASHBOARD);
  
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const { data: upcomingPaymentsData, loading: loadingUpcoming } = useQuery<UpcomingPaymentsData>(
    GET_UPCOMING_PAYMENTS,
    {
      variables: {
        filter: {
          month: nextMonth.getMonth() + 1,
          year: nextMonth.getFullYear(),
        },
      },
    }
  );

  if (loading || loadingUpcoming) {
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
              <p className="text-[10px] sm:text-xs text-white/70">Total Pemasukan</p>
              <p className="text-sm sm:text-base font-semibold text-white break-all">{formatIDR(totalIncome)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] sm:text-xs text-white/70">Total Pengeluaran</p>
              <p className="text-sm sm:text-base font-semibold text-white break-all">{formatIDR(totalOutflow)}</p>
            </div>
          </div>
        }
      />

      {/* Monthly Cash Flow Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pemasukan</CardTitle>
            <BadgeDollarSign className="h-4 w-4 text-income" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-income">
              {formatIDR(balanceSummary?.totalIncome || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total income bulan ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengeluaran</CardTitle>
            <Wallet className="h-4 w-4 text-expense" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense">
              {formatIDR(balanceSummary?.totalExpense || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Belanja & kebutuhan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cicilan</CardTitle>
            <CreditCard className="h-4 w-4 text-installment" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-installment">
              {formatIDR(balanceSummary?.totalInstallmentPayment || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pembayaran aktual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hutang</CardTitle>
            <Receipt className="h-4 w-4 text-debt" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-debt">
              {formatIDR(balanceSummary?.totalDebtPayment || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pembayaran aktual</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Payments Cards - Conditional Rendering */}
      {(() => {
        const hasInstallment = (upcomingPaymentsData?.upcomingPayments?.totalInstallment || 0) > 0;
        const hasDebt = (upcomingPaymentsData?.upcomingPayments?.totalDebt || 0) > 0;
        const visibleCount = (hasInstallment ? 1 : 0) + (hasDebt ? 1 : 0);
        
        if (visibleCount === 0) return null;
        
        return (
          <div className={`grid gap-4 ${visibleCount === 2 ? 'md:grid-cols-2' : ''}`}>
            {hasInstallment && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tagihan Cicilan Bulan Depan</CardTitle>
                  <CreditCard className="h-4 w-4 text-installment" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-installment">
                    {formatIDR(upcomingPaymentsData?.upcomingPayments?.totalInstallment || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {upcomingPaymentsData?.upcomingPayments?.installments?.length || 0} upcoming payments
                  </p>
                </CardContent>
              </Card>
            )}

            {hasDebt && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tagihan Hutang Bulan Depan</CardTitle>
                  <Receipt className="h-4 w-4 text-debt" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-debt">
                    {formatIDR(upcomingPaymentsData?.upcomingPayments?.totalDebt || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {upcomingPaymentsData?.upcomingPayments?.debts?.length || 0} upcoming payments
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );
      })()}

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Cash Flow Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Arus Kas Bulan Ini</CardTitle>
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
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{
                      backgroundColor: "#18181B",
                      border: "1px solid #27272A",
                      borderRadius: "8px",
                      color: "#FFFFFF",
                    }}
                    itemStyle={{ color: "#FFFFFF" }}
                    labelStyle={{ color: "#FFFFFF" }}
                    formatter={(value) => [formatIDR(value as number), null]}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                    {cashFlowData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Categories Bar Chart */}
        <Card>
            <CardHeader>
              <CardTitle>Top Kategori</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical">
                      <defs>
                        {categoryData.map((entry, index) => (
                          <linearGradient key={`gradient-${index}`} id={entry.gradientId} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={entry.gradientColors[0]} />
                            <stop offset="100%" stopColor={entry.gradientColors[1]} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                      <XAxis
                        type="number"
                        stroke="#71717A"
                        fontSize={12}
                        tickFormatter={(value) => `${value / 1000000}jt`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="#71717A"
                        fontSize={12}
                        width={80}
                      />
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{
                          backgroundColor: "#18181B",
                          border: "1px solid #27272A",
                          borderRadius: "8px",
                          color: "#FFFFFF",
                        }}
                        itemStyle={{ color: "#FFFFFF" }}
                        labelStyle={{ color: "#FFFFFF" }}
                        formatter={(value) => [formatIDR(value as number), null]}
                      />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} isAnimationActive={false}>
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm">Belum ada kategori</p>
                  <p className="text-xs mt-1">Buat kategori untuk mulai tracking</p>
                </div>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
