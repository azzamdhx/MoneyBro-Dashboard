"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GET_RECURRING_INCOME_GROUPS, GET_INCOMES } from "@/lib/graphql/queries";
import {
  CREATE_INCOME,
  UPDATE_INCOME,
  DELETE_INCOME,
} from "@/lib/graphql/mutations";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { MonthPicker } from "@/components/ui/month-picker";
import { formatIDR } from "@/lib/utils/currency";
import { toRFC3339 } from "@/lib/utils/format";
import { EditableIncomeTable, EditableIncomeTableRef } from "@/components/income/editable-income-table";

interface Category {
  id: string;
  name: string;
}

interface RecurringIncomeGroup {
  id: string;
  name: string;
  total: number;
  items: {
    id: string;
    sourceName: string;
    amount: number;
    category: Category;
  }[];
}

interface RecurringIncomeGroupsData {
  recurringIncomeGroups: RecurringIncomeGroup[];
}

interface Income {
  id: string;
  sourceName: string;
  amount: number;
  incomeDate: string | null;
  isRecurring: boolean;
  notes: string | null;
  pocketId: string | null;
  category: Category;
}

interface IncomesData {
  incomes: {
    items: Income[];
    summary: {
      total: number;
      count: number;
    };
  };
}

export default function CreateIncomePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const monthParam = searchParams.get("month");

  // Redirect if not creating new — editing is handled in month/[monthKey]/page.tsx
  useEffect(() => {
    if (id !== "new") {
      router.replace("/incomes");
    }
  }, [id, router]);

  const [incomeDate, setIncomeDate] = useState(
    monthParam || new Date().toISOString().slice(0, 7)
  );

  const { data: recurringData } = useQuery<RecurringIncomeGroupsData>(GET_RECURRING_INCOME_GROUPS, {
    variables: { isActive: true },
  });

  const { data: incomesData, loading } = useQuery<IncomesData>(GET_INCOMES);

  const recurringGroups = recurringData?.recurringIncomeGroups || [];

  const allIncomes: Income[] = useMemo(
    () => incomesData?.incomes.items || [],
    [incomesData]
  );
  const incomes = allIncomes.filter((income) => {
    const incomeMonth = income.incomeDate?.slice(0, 7);
    return incomeMonth === incomeDate;
  });

  // Get existing months from incomes
  const existingMonths = useMemo(() => new Set<string>(
    allIncomes
      .map(i => i.incomeDate?.slice(0, 7))
      .filter((v): v is string => Boolean(v))
  ), [allIncomes]);

  // Auto-select first available future month (only on initial load)
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (incomesData && !monthParam && !hasAutoSelected.current) {
      const now = new Date();
      for (let i = 0; i <= 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthValue = date.toISOString().slice(0, 7);
        if (!existingMonths.has(monthValue)) {
          setIncomeDate(monthValue);
          hasAutoSelected.current = true;
          break;
        }
      }
    }
  }, [incomesData, existingMonths, monthParam]);

  const [createIncome] = useMutation(CREATE_INCOME);
  const [updateIncome] = useMutation(UPDATE_INCOME);
  const [deleteIncome] = useMutation(DELETE_INCOME);
  const tableRef = useRef<EditableIncomeTableRef>(null);

  const handleSelectRecurringGroup = (groupId: string) => {
    const group = recurringGroups.find(g => g.id === groupId);
    if (!group) return;

    for (const item of group.items) {
      tableRef.current?.addItem({
        categoryId: item.category.id,
        sourceName: item.sourceName,
        amount: item.amount,
      });
    }
    toast.success(`Ditambahkan ${group.items.length} item dari: ${group.name}`);
  };

  if (id !== "new") return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Pemasukan</h1>
            <p className="text-muted-foreground hidden sm:block">
              Catat pemasukan baru
            </p>
          </div>
        </div>
      </div>

      {/* Date */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start w-fit">
          <MonthPicker
              value={incomeDate}
              onChange={setIncomeDate}
              disabledMonths={existingMonths}
              className="max-w-xs m-0"
            />
            {existingMonths.has(incomeDate) && (
              <p className="text-sm text-destructive">
                Bulan ini sudah memiliki data. Silakan pilih bulan lain atau update data yang sudah ada.
              </p>
            )}
      </div>

      {/* Editable Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="md:text-lg text-sm">Detail Pemasukan</CardTitle>
          {recurringGroups.length > 0 && (
            <Select onValueChange={handleSelectRecurringGroup}>
              <SelectTrigger>
                <RefreshCw className="h-4 w-4 mr-2 text-income" />
                <SelectValue placeholder="Tetap" />
              </SelectTrigger>
              <SelectContent>
                {recurringGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name} - {formatIDR(g.total)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent className="px-6">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : (
            <EditableIncomeTable
              ref={tableRef}
              items={incomes}
              onCreateItem={async (input) => {
                await createIncome({ variables: { input: { ...input, incomeDate: toRFC3339(incomeDate) } } });
              }}
              onUpdateItem={async (id, input) => {
                await updateIncome({ variables: { id, input } });
              }}
              onDeleteItem={async (id) => {
                await deleteIncome({ variables: { id } });
              }}
              onSaveComplete={() => router.replace(`/incomes/month/${incomeDate}`)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
