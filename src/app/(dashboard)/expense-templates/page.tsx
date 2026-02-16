"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/utils/currency";
import { GET_EXPENSE_TEMPLATE_GROUPS } from "@/lib/graphql/queries";
import { Plus, FileText, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ExpenseTemplateItem {
  id: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  total: number;
  category: {
    id: string;
    name: string;
  };
}

interface ExpenseTemplateGroup {
  id: string;
  name: string;
  recurringDay: number | null;
  notes: string | null;
  total: number;
  createdAt: string;
  items: ExpenseTemplateItem[];
}

interface ExpenseTemplateGroupsData {
  expenseTemplateGroups: ExpenseTemplateGroup[];
}

export default function ExpenseTemplatesPage() {
  const router = useRouter();
  const { data, loading } = useQuery<ExpenseTemplateGroupsData>(GET_EXPENSE_TEMPLATE_GROUPS);
  const [fabOpen, setFabOpen] = useState(false);

  const groups = data?.expenseTemplateGroups || [];
  const totalAmount = groups.reduce((sum, g) => sum + g.total, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-20" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-expense/10 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-expense" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Template Pengeluaran</h1>
            <p className="text-muted-foreground text-sm hidden sm:block">Kelola template untuk input cepat</p>
          </div>
        </div>
        <Button asChild size="sm" className="hidden md:inline-flex">
          <Link href="/expense-templates/new">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Template
          </Link>
        </Button>
      </div>

      <Card className="bg-card border-1">
        <CardHeader>
          <CardTitle className="flex flex-col items-start gap-4">
            <span className="text-primary">Total Template</span>
            <span className="text-2xl text-expense">{formatIDR(totalAmount)}</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {groups.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card
              key={group.id}
              className="cursor-pointer hover:border-accent transition-colors py-0"
              onClick={() => router.push(`/expense-templates/${group.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="h-8 w-8 rounded-lg bg-expense/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-expense" />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {group.items.length} item
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold">{group.name}</h3>
                  <p className="text-lg font-bold text-expense">{formatIDR(group.total)}</p>
                </div>
                {group.recurringDay && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-xs">Tgl {group.recurringDay}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <FileText className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">Belum ada template</p>
            <p className="text-xs mt-1">Klik tombol Tambah untuk membuat template baru</p>
          </CardContent>
        </Card>
      )}
    </div>

    {/* Floating Action Button - Mobile Only */}
    <div className="fixed bottom-28 right-6 z-[60] md:hidden">
      <Popover open={fabOpen} onOpenChange={setFabOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200",
              fabOpen
                ? "bg-destructive text-destructive-foreground scale-95"
                : "bg-primary text-primary-foreground"
            )}
          >
            {fabOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Plus className="h-6 w-6" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-52 p-2 mb-2 border-border/50 shadow-2xl backdrop-blur-xl bg-gradient-to-b from-card/95 to-background/95"
          align="end"
          side="top"
        >
          <div className="grid gap-1">
            <Link
              href="/expense-templates/new"
              onClick={() => setFabOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-muted-foreground hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah</span>
            </Link>
          </div>
        </PopoverContent>
      </Popover>
    </div>
    </>
  );
}
