"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HighlightCard } from "@/components/ui/highlight-card";
import { formatIDR } from "@/lib/utils/currency";
import { formatMonthYear } from "@/lib/utils/format";
import { GET_INCOMES, GET_EXPENSES, GET_DEBTS, GET_INSTALLMENTS, GET_UPCOMING_PAYMENTS } from "@/lib/graphql/queries";
import {
  Wallet,
  BarChart3,
  Receipt,
  CreditCard,
  BadgeDollarSign,
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

interface Income {
  id: string;
  incomeDate: string | Date | null;
}

interface Expense {
  id: string;
  expenseDate: string | Date | null;
}

interface IncomeSummary {
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
}

interface ExpenseSummary {
  total: number;
  count: number;
  byCategory: {
    category: { id: string; name: string };
    totalAmount: number;
    count: number;
  }[];
}

interface IncomesData {
  incomes: {
    items: Income[];
    summary: IncomeSummary;
  };
}

interface ExpensesData {
  expenses: {
    items: Expense[];
    summary: ExpenseSummary;
  };
}

interface Debt {
  id: string;
  dueDate: string | Date | null;
  payments: { paidAt: string | Date }[];
  personName?: string;
  monthlyPayment?: number;
}

interface Installment {
  id: string;
  startDate: string | Date;
  dueDay: number;
  tenor: number;
  paidCount: number;
  payments: { paidAt: string | Date }[];
  name?: string;
  monthlyPayment?: number;
}

interface DebtsData {
  debts: Debt[];
}

interface InstallmentsData {
  installments: Installment[];
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

function getMonthDateRange(monthKey: string): { startDate: string; endDate: string } | null {
  if (!monthKey) return null;
  
  const [year, month] = monthKey.split("-").map(Number);
  if (isNaN(year) || isNaN(month)) return null;
  
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

function getMonthKey(dateValue: string | Date | null | undefined): string | null {
  if (!dateValue) return null;
  
  // Handle both string and Date object
  const dateStr = typeof dateValue === 'string' ? dateValue : dateValue.toISOString();
  return dateStr.slice(0, 7);
}

function getAvailableFutureMonths(
  incomes: Income[], 
  expenses: Expense[],
  debts: Debt[],
  installments: Installment[]
): { value: string; label: string }[] {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthSet = new Set<string>();

  incomes.forEach((income) => {
    const monthKey = getMonthKey(income.incomeDate);
    if (monthKey && monthKey > currentMonth) {
      monthSet.add(monthKey);
    }
  });

  expenses.forEach((expense) => {
    const monthKey = getMonthKey(expense.expenseDate);
    if (monthKey && monthKey > currentMonth) {
      monthSet.add(monthKey);
    }
  });

  // Include debt due dates for future months
  debts.forEach((debt) => {
    const monthKey = getMonthKey(debt.dueDate);
    if (monthKey && monthKey > currentMonth) {
      monthSet.add(monthKey);
    }
  });

  // Include future installment payment months
  installments.forEach((installment) => {
    if (installment.startDate && installment.tenor && installment.paidCount !== undefined) {
      const startDate = new Date(installment.startDate);
      const remainingPayments = installment.tenor - installment.paidCount;
      
      for (let i = 0; i < remainingPayments; i++) {
        const paymentDate = new Date(startDate);
        paymentDate.setMonth(paymentDate.getMonth() + installment.paidCount + i);
        const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, "0")}`;
        if (monthKey > currentMonth) {
          monthSet.add(monthKey);
        }
      }
    }
  });

  const sortedMonths = Array.from(monthSet).sort();

  return sortedMonths.map((monthKey) => {
    const [year, month] = monthKey.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return {
      value: monthKey,
      label: formatMonthYear(date),
    };
  });
}

export default function ForecastPage() {
  const { data: incomesData, loading: loadingIncomes } = useQuery<IncomesData>(GET_INCOMES);
  const { data: expensesData, loading: loadingExpenses } = useQuery<ExpensesData>(GET_EXPENSES);
  const { data: debtsData, loading: loadingDebts } = useQuery<DebtsData>(GET_DEBTS);
  const { data: installmentsData, loading: loadingInstallments } = useQuery<InstallmentsData>(GET_INSTALLMENTS);

  const availableMonths = useMemo(() => {
    if (!incomesData || !expensesData) return [];
    return getAvailableFutureMonths(
      incomesData.incomes.items, 
      expensesData.expenses.items,
      debtsData?.debts || [],
      installmentsData?.installments || []
    );
  }, [incomesData, expensesData, debtsData, installmentsData]);

  const [selectedMonth, setSelectedMonth] = useState("");

  // Set default month when data loads
  const defaultMonth = availableMonths[0]?.value || "";
  if (!selectedMonth && defaultMonth) {
    setSelectedMonth(defaultMonth);
  }
  
  const dateRange = useMemo(() => getMonthDateRange(selectedMonth), [selectedMonth]);
  
  const selectedMonthDate = useMemo(() => {
    if (!selectedMonth) return null;
    const [year, month] = selectedMonth.split('-').map(Number);
    return { month, year };
  }, [selectedMonth]);
  
  const { data: upcomingPaymentsData, loading: loadingUpcoming } = useQuery<UpcomingPaymentsData>(
    GET_UPCOMING_PAYMENTS,
    {
      variables: {
        filter: {
          month: selectedMonthDate?.month || 0,
          year: selectedMonthDate?.year || 0,
        },
      },
      skip: !selectedMonthDate,
    }
  );
  
  // Fetch filtered incomes and expenses for selected month
  const { data: filteredIncomesData, loading: loadingFilteredIncomes } = useQuery<IncomesData>(
    GET_INCOMES,
    {
      variables: {
        filter: {
          startDate: dateRange?.startDate,
          endDate: dateRange?.endDate,
        },
      },
      skip: !dateRange,
    }
  );
  
  const { data: filteredExpensesData, loading: loadingFilteredExpenses } = useQuery<ExpensesData>(
    GET_EXPENSES,
    {
      variables: {
        filter: {
          startDate: dateRange?.startDate,
          endDate: dateRange?.endDate,
        },
      },
      skip: !dateRange,
    }
  );

  if (loadingIncomes || loadingExpenses || loadingDebts || loadingInstallments || loadingUpcoming || loadingFilteredIncomes || loadingFilteredExpenses) {
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

  if (availableMonths.length === 0) {
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

  // Get summary data from filtered queries
  const incomeSummary = filteredIncomesData?.incomes.summary;
  const expenseSummary = filteredExpensesData?.expenses.summary;
  
  // For forecast, use upcomingPayments data instead of actual balance
  const projectedInstallment = upcomingPaymentsData?.upcomingPayments?.totalInstallment || 0;
  const projectedDebt = upcomingPaymentsData?.upcomingPayments?.totalDebt || 0;
  const projectedExpense = expenseSummary?.total || 0; // Keep expense from summary as it includes recurring
  
  const hasData = (incomeSummary?.total || 0) > 0 || 
                  projectedExpense > 0 || 
                  projectedInstallment > 0 || 
                  projectedDebt > 0;
  
  const totalOutflow = projectedExpense + projectedInstallment + projectedDebt;

  const totalIncome = incomeSummary?.total || 0;
  const netBalance = totalIncome - totalOutflow;
  const balancePercentage = totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : 0;

  const cashFlowData = [
    {
      name: "Pemasukan",
      value: totalIncome,
      fill: "url(#gradient-income)",
      gradientColors: ["#43e97b", "#38f9d7"]
    },
    {
      name: "Pengeluaran",
      value: projectedExpense,
      fill: "url(#gradient-expense)",
      gradientColors: ["#fa709a", "#fee140"]
    },
    {
      name: "Cicilan",
      value: projectedInstallment,
      fill: "url(#gradient-installment)",
      gradientColors: ["#667eea", "#764ba2"]
    },
    {
      name: "Hutang",
      value: projectedDebt,
      fill: "url(#gradient-debt)",
      gradientColors: ["#f093fb", "#f5576c"]
    }
  ];

  const expenseCategoryData = expenseSummary?.byCategory.map((item: { category: { id: string; name: string }; totalAmount: number; count: number }, index: number) => ({
    name: item.category.name,
    value: item.totalAmount,
    fill: `url(#gradient-expense-${index})`,
    gradientId: `gradient-expense-${index}`,
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

  const incomeCategoryData = incomeSummary?.byCategory.map((item: { category: { id: string; name: string }; totalAmount: number; count: number }, index: number) => ({
    name: item.category.name,
    value: item.totalAmount,
    fill: `url(#gradient-income-cat-${index})`,
    gradientId: `gradient-income-cat-${index}`,
    gradientColors: [
      ["#43e97b", "#38f9d7"],
      ["#667eea", "#764ba2"],
      ["#4facfe", "#00f2fe"],
      ["#f093fb", "#f5576c"],
      ["#fa709a", "#fee140"],
      ["#30cfd0", "#330867"],
      ["#a8edea", "#fed6e3"],
      ["#ff9a9e", "#fecfef"],
    ][index % 8],
  })) || [];

  const upcomingPaymentsChartData = [
    ...upcomingPaymentsData?.upcomingPayments?.installments?.map((item, index) => ({
      name: item.name,
      value: item.monthlyPayment,
      type: "Cicilan",
      fill: `url(#gradient-upcoming-${index})`,
      gradientColors: ["#667eea", "#764ba2"]
    })) || [],
    ...upcomingPaymentsData?.upcomingPayments?.debts?.map((item, index) => ({
      name: item.personName,
      value: item.monthlyPayment || 0,
      type: "Hutang",
      fill: `url(#gradient-upcoming-debt-${index})`,
      gradientColors: ["#f093fb", "#f5576c"]
    })) || []
  ].slice(0, 8);

  const getBalanceGradientBg = () => {
    if (!hasData) return "bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800";
    // Use recalculated netBalance
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Forecast</h1>
            <p className="text-muted-foreground">Proyeksi keuangan bulan mendatang</p>
          </div>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-fit">
            <SelectValue placeholder="Pilih bulan" />
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
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
            <h3 className="text-lg font-medium">Belum ada data untuk {selectedMonth ? formatMonthYear(`${selectedMonth}-01`) : "bulan ini"}</h3>
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
                Proyeksi Saldo {selectedMonth ? formatMonthYear(`${selectedMonth}-01`) : ""}
              </p>
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
                  <p className="text-[10px] sm:text-xs text-white/70">Proyeksi Pemasukan</p>
                  <p className="text-sm sm:text-base font-semibold text-white break-all">{formatIDR(totalIncome)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] sm:text-xs text-white/70">Proyeksi Pengeluaran</p>
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
                  {formatIDR(incomeSummary?.total || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{incomeSummary?.count || 0} transaksi</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pengeluaran</CardTitle>
                <Wallet className="h-4 w-4 text-expense" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-expense">
                  {formatIDR(expenseSummary?.total || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{expenseSummary?.count || 0} transaksi</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cicilan</CardTitle>
                <CreditCard className="h-4 w-4 text-installment" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-installment">
                  {formatIDR(upcomingPaymentsData?.upcomingPayments?.totalInstallment || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{upcomingPaymentsData?.upcomingPayments?.installments?.length || 0} pembayaran</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hutang</CardTitle>
                <Receipt className="h-4 w-4 text-debt" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-debt">
                  {formatIDR(upcomingPaymentsData?.upcomingPayments?.totalDebt || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{upcomingPaymentsData?.upcomingPayments?.debts?.length || 0} pembayaran</p>
              </CardContent>
            </Card>
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
