"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GET_EXPENSE_TEMPLATE_GROUPS, GET_EXPENSES } from "@/lib/graphql/queries";
import { CREATE_EXPENSE, UPDATE_EXPENSE, DELETE_EXPENSE } from "@/lib/graphql/mutations";
import { toast } from "sonner";
import { ArrowLeft, FileText } from "lucide-react";
import { MonthPicker } from "@/components/ui/month-picker";
import { toRFC3339 } from "@/lib/utils/format";
import { Skeleton } from "@/components/ui/skeleton";
import { EditableExpenseTable, EditableExpenseTableRef } from "@/components/expense/editable-expense-table";

interface Category {
  id: string;
  name: string;
}

interface ExpenseTemplateItem {
  id: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  total: number;
  category: Category;
}

interface ExpenseTemplateGroup {
  id: string;
  name: string;
  items: ExpenseTemplateItem[];
}

interface ExpenseTemplateGroupsData {
  expenseTemplateGroups: ExpenseTemplateGroup[];
}

interface Expense {
  id: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  total: number;
  notes: string | null;
  expenseDate: string | null;
  category: Category;
}

interface ExpensesData {
  expenses: {
    items: Expense[];
    summary: {
      total: number;
      count: number;
    };
  };
}

export default function CreateExpensePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const monthParam = searchParams.get("month");

  // Redirect if not creating new — editing is handled in month/[monthKey]/page.tsx
  useEffect(() => {
    if (id !== "new") {
      router.replace("/expenses");
    }
  }, [id, router]);

  const [expenseDate, setExpenseDate] = useState(
    monthParam || new Date().toISOString().slice(0, 7)
  );

  const { data: templateGroupsData } = useQuery<ExpenseTemplateGroupsData>(GET_EXPENSE_TEMPLATE_GROUPS);

  const { data: expensesData, loading } = useQuery<ExpensesData>(GET_EXPENSES);

  const templateGroups = templateGroupsData?.expenseTemplateGroups || [];

  const allExpenses: Expense[] = useMemo(
    () => expensesData?.expenses.items || [],
    [expensesData]
  );
  const expenses = allExpenses.filter((expense) => {
    const expenseMonth = expense.expenseDate?.slice(0, 7);
    return expenseMonth === expenseDate;
  });

  // Get existing months from expenses
  const existingMonths = useMemo(() => new Set<string>(
    allExpenses
      .map(e => e.expenseDate?.slice(0, 7))
      .filter((v): v is string => Boolean(v))
  ), [allExpenses]);

  // Auto-select first available future month (only on initial load)
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (expensesData && !monthParam && !hasAutoSelected.current) {
      const now = new Date();
      // Check from current month up to 12 months ahead
      for (let i = 0; i <= 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthValue = date.toISOString().slice(0, 7);
        if (!existingMonths.has(monthValue)) {
          setExpenseDate(monthValue);
          hasAutoSelected.current = true;
          break;
        }
      }
    }
  }, [expensesData, existingMonths, monthParam]);

  const [createExpense] = useMutation(CREATE_EXPENSE);
  const [updateExpense] = useMutation(UPDATE_EXPENSE);
  const [deleteExpense] = useMutation(DELETE_EXPENSE);
  const tableRef = useRef<EditableExpenseTableRef>(null);

  const handleSelectTemplateGroup = (groupId: string) => {
    const group = templateGroups.find(g => g.id === groupId);
    if (!group || group.items.length === 0) return;

    group.items.forEach(item => {
      tableRef.current?.addItem({
        categoryId: item.category.id,
        itemName: item.itemName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      });
    });
    toast.success(`${group.items.length} item ditambahkan dari template: ${group.name}`);
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
            <h1 className="text-2xl font-bold">Tambah Pengeluaran</h1>
            <p className="text-muted-foreground hidden sm:block">
              Rencanakan pengeluaran bulanan kamu
            </p>
          </div>
        </div>
      </div>

      {/* Archive Input - Date */}
      <div className="flex justify-end sm:justify-start">
          <MonthPicker
              value={expenseDate}
              onChange={setExpenseDate}
              disabledMonths={existingMonths}
              className="max-w-xs m-0"
            />
            {existingMonths.has(expenseDate) && (
              <p className="text-sm text-destructive">
                Bulan ini sudah memiliki data. Silakan pilih bulan lain atau update data yang sudah ada.
              </p>
            )}
      </div>

      {/* Editable Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Detail Pengeluaran</CardTitle>
          {templateGroups.length > 0 && (
            <Select onValueChange={handleSelectTemplateGroup}>
              <SelectTrigger>
                <FileText className="h-4 w-4 mr-2 text-expense" />
                <SelectValue placeholder="Template" />
              </SelectTrigger>
              <SelectContent>
                {templateGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name} ({g.items.length} item)
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
            <EditableExpenseTable
              ref={tableRef}
              items={expenses}
              onCreateItem={async (input) => {
                await createExpense({ variables: { input: { ...input, expenseDate: toRFC3339(expenseDate) } } });
              }}
              onUpdateItem={async (id, input) => {
                await updateExpense({ variables: { id, input } });
              }}
              onDeleteItem={async (id) => {
                await deleteExpense({ variables: { id } });
              }}
              onSaveComplete={() => router.replace(`/expenses/month/${expenseDate}`)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
