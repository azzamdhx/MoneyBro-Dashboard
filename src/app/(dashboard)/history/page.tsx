"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HighlightCard } from "@/components/ui/highlight-card";
import { formatIDR } from "@/lib/utils/currency";
import { formatMonthYear } from "@/lib/utils/format";
import { GET_INCOMES, GET_EXPENSES, GET_DEBTS, GET_INSTALLMENTS, GET_ACTUAL_PAYMENTS } from "@/lib/graphql/queries";
import {
  Wallet,
  BarChart3,
  Receipt,
  CreditCard,
  BadgeDollarSign,
  History,
  CalendarX,
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
}

interface Installment {
  id: string;
  startDate: string | Date;
  payments: { paidAt: string | Date }[];
}

interface DebtsData {
  debts: Debt[];
}

interface InstallmentsData {
  installments: Installment[];
}

interface ActualPaymentsData {
  actualPayments: {
    installments: {
      installmentId: string;
      name: string;
      amount: number;
      transactionDate: string;
      description: string;
    }[];
    debts: {
      debtId: string;
      personName: string;
      amount: number;
      transactionDate: string;
      description: string;
    }[];
    totalInstallment: number;
    totalDebt: number;
    totalPayments: number;
  };
}

function getMonthDateRange(monthKey: string): { startDate: string; endDate: string } | null {
  if (!monthKey) return null;
  
  const [year, month] = monthKey.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

function getMonthDateRangeSimple(monthKey: string): { startDate: string; endDate: string } | null {
  if (!monthKey) return null;
  
  const [year, month] = monthKey.split("-").map(Number);
  if (isNaN(year) || isNaN(month)) return null;
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  // Format as YYYY-MM-DD for actualPayments query
  const pad = (n: number) => String(n).padStart(2, '0');
  
  return {
    startDate: `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`,
    endDate: `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`,
  };
}

function getMonthKey(dateValue: string | Date | null | undefined): string | null {
  if (!dateValue) return null;
  
  // Handle both string and Date object
  const dateStr = typeof dateValue === 'string' ? dateValue : dateValue.toISOString();
  return dateStr.slice(0, 7);
}

function getAvailablePastMonths(
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
    if (monthKey && monthKey < currentMonth) {
      monthSet.add(monthKey);
    }
  });

  expenses.forEach((expense) => {
    const monthKey = getMonthKey(expense.expenseDate);
    if (monthKey && monthKey < currentMonth) {
      monthSet.add(monthKey);
    }
  });

  // Include debt payment dates
  debts.forEach((debt) => {
    debt.payments?.forEach((payment) => {
      const monthKey = getMonthKey(payment.paidAt);
      if (monthKey && monthKey < currentMonth) {
        monthSet.add(monthKey);
      }
    });
  });

  // Include installment payment dates
  installments.forEach((installment) => {
    installment.payments?.forEach((payment) => {
      const monthKey = getMonthKey(payment.paidAt);
      if (monthKey && monthKey < currentMonth) {
        monthSet.add(monthKey);
      }
    });
  });

  const sortedMonths = Array.from(monthSet).sort().reverse();

  return sortedMonths.map((monthKey) => {
    const [year, month] = monthKey.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return {
      value: monthKey,
      label: formatMonthYear(date),
    };
  });
}

export default function HistoryPage() {
  const { data: incomesData, loading: loadingIncomes } = useQuery<IncomesData>(GET_INCOMES);
  const { data: expensesData, loading: loadingExpenses } = useQuery<ExpensesData>(GET_EXPENSES);
  const { data: debtsData, loading: loadingDebts } = useQuery<DebtsData>(GET_DEBTS);
  const { data: installmentsData, loading: loadingInstallments } = useQuery<InstallmentsData>(GET_INSTALLMENTS);

  const availableMonths = useMemo(() => {
    if (!incomesData || !expensesData) return [];
    return getAvailablePastMonths(
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
  const dateRangeSimple = useMemo(() => getMonthDateRangeSimple(selectedMonth), [selectedMonth]);
  
  const { data: actualPaymentsData, loading: loadingActual } = useQuery<ActualPaymentsData>(
    GET_ACTUAL_PAYMENTS,
    {
      variables: {
        filter: {
          startDate: dateRangeSimple?.startDate || "",
          endDate: dateRangeSimple?.endDate || "",
        },
      },
      skip: !dateRangeSimple,
    }
  );
  
  // Fetch filtered incomes and expenses for selected month (use RFC3339 format)
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

  if (loadingIncomes || loadingExpenses || loadingDebts || loadingInstallments || loadingActual || loadingFilteredIncomes || loadingFilteredExpenses) {
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
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">History</h1>
            <p className="text-muted-foreground">Riwayat keuangan bulan sebelumnya</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <CalendarX className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Belum ada data history</h3>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
              Tidak ada transaksi di bulan-bulan sebelumnya. Mulai catat pemasukan atau pengeluaran kamu.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get summary data from filtered queries
  const incomeSummary = filteredIncomesData?.incomes.summary;
  const expenseSummary = filteredExpensesData?.expenses.summary;
  
  // For history, use actualPayments for installments and debts (from transactions table)
  const totalOutflow = (expenseSummary?.total || 0) +
    (actualPaymentsData?.actualPayments?.totalInstallment || 0) +
    (actualPaymentsData?.actualPayments?.totalDebt || 0);

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
      value: expenseSummary?.total || 0,
      fill: "url(#gradient-expense)",
      gradientColors: ["#fa709a", "#fee140"]
    },
    {
      name: "Cicilan",
      value: actualPaymentsData?.actualPayments?.totalInstallment || 0,
      fill: "url(#gradient-installment)",
      gradientColors: ["#667eea", "#764ba2"]
    },
    {
      name: "Hutang",
      value: actualPaymentsData?.actualPayments?.totalDebt || 0,
      fill: "url(#gradient-debt)",
      gradientColors: ["#f093fb", "#f5576c"]
    }
  ];

  const expenseCategoryData = expenseSummary?.byCategory.map((item, index) => ({
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

  const incomeCategoryData = incomeSummary?.byCategory.map((item, index) => ({
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

  const previousPaymentsChartData = [
    ...actualPaymentsData?.actualPayments?.installments?.map((item, index) => ({
      name: item.name,
      value: item.amount,
      type: "Cicilan",
      fill: `url(#gradient-previous-${index})`,
      gradientColors: ["#667eea", "#764ba2"]
    })) || [],
    ...actualPaymentsData?.actualPayments?.debts?.map((item, index) => ({
      name: item.personName,
      value: item.amount || 0,
      type: "Hutang",
      fill: `url(#gradient-previous-debt-${index})`,
      gradientColors: ["#f093fb", "#f5576c"]
    })) || []
  ].slice(0, 8);

  const getBalanceGradientBg = () => {
    if (netBalance > 0) return "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600";
    if (netBalance < 0) return "bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600";
    return "bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500";
  };
  
  const getBalanceColor = () => {
    return "text-white";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">History</h1>
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

      {/* Net Balance Hero Card */}
      <HighlightCard
        gradientColor={getBalanceGradientBg()}
        balanceLabel={
          <p className="text-xs sm:text-sm font-medium text-white/70">
            {selectedMonth ? formatMonthYear(`${selectedMonth}-01`) : ""}
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

      {/* Monthly Cash Flow Cards */}
      <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-x-visible md:pb-0">
        <Link href="/incomes" className="min-w-[200px] flex-shrink-0 md:min-w-0 md:flex-shrink">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pemasukan</CardTitle>
              <BadgeDollarSign className="h-4 w-4 text-income" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-income">
                {formatIDR(incomeSummary?.total || 0)}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/expenses" className="min-w-[200px] flex-shrink-0 md:min-w-0 md:flex-shrink">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pengeluaran</CardTitle>
              <Wallet className="h-4 w-4 text-expense" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-expense">
                {formatIDR(expenseSummary?.total || 0)}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/installments" className="min-w-[200px] flex-shrink-0 md:min-w-0 md:flex-shrink">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cicilan</CardTitle>
              <CreditCard className="h-4 w-4 text-installment" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-installment">
                {formatIDR(actualPaymentsData?.actualPayments?.totalInstallment || 0)}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/debts" className="min-w-[200px] flex-shrink-0 md:min-w-0 md:flex-shrink">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hutang</CardTitle>
              <Receipt className="h-4 w-4 text-debt" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-debt">
                {formatIDR(actualPaymentsData?.actualPayments?.totalDebt || 0)}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        {/* Cash Flow Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Arus Kas</CardTitle>
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

        {/* Previous Payments Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Previous Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {previousPaymentsChartData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={previousPaymentsChartData} layout="vertical">
                    <defs>
                      {previousPaymentsChartData.map((entry, index) => (
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
                      {previousPaymentsChartData.map((entry, index) => (
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
    </div>
  );
}
