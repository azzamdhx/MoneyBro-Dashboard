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
import { GET_RECURRING_INCOMES, GET_INCOMES } from "@/lib/graphql/queries";
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

interface RecurringIncome {
  id: string;
  sourceName: string;
  amount: number;
  incomeType: string;
  recurringDay: number;
  isActive: boolean;
  notes: string | null;
  category: Category;
}

interface RecurringIncomesData {
  recurringIncomes: RecurringIncome[];
}

interface Income {
  id: string;
  sourceName: string;
  amount: number;
  incomeType: string;
  incomeDate: string | null;
  isRecurring: boolean;
  notes: string | null;
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

  const { data: recurringData } = useQuery<RecurringIncomesData>(GET_RECURRING_INCOMES, {
    variables: { isActive: true },
  });

  const { data: incomesData, loading } = useQuery<IncomesData>(GET_INCOMES);

  const recurringIncomes = recurringData?.recurringIncomes || [];

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

  const handleSelectRecurring = (recurringId: string) => {
    const recurring = recurringIncomes.find(r => r.id === recurringId);
    if (!recurring) return;

    tableRef.current?.addItem({
      categoryId: recurring.category.id,
      sourceName: recurring.sourceName,
      amount: recurring.amount,
      incomeType: recurring.incomeType,
    });
    toast.success(`Ditambahkan dari income tetap: ${recurring.sourceName}`);
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
            <h1 className="text-2xl font-bold">Tambah Pemasukan</h1>
            <p className="text-muted-foreground hidden sm:block">
              Catat pemasukan baru
            </p>
          </div>
        </div>
      </div>

      {/* Archive Input - Date */}
      <div className="flex justify-end sm:justify-start">
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
          <CardTitle>Detail Pemasukan</CardTitle>
          {recurringIncomes.length > 0 && (
            <Select onValueChange={handleSelectRecurring}>
              <SelectTrigger>
                <RefreshCw className="h-4 w-4 mr-2 text-income" />
                <SelectValue placeholder="Tetap" />
              </SelectTrigger>
              <SelectContent>
                {recurringIncomes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.sourceName} - {formatIDR(r.amount)}
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
