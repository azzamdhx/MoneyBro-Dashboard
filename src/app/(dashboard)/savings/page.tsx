"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils/currency";
import { GET_SAVINGS_GOALS } from "@/lib/graphql/queries";
import { Plus, PiggyBank, CheckCircle2, Clock, X, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDateShortID } from "@/lib/utils/format";
import { getSavingsEmoji } from "@/lib/utils/emoji-storage";

interface SavingsContribution {
  id: string;
  amount: number;
  contributionDate: string;
  notes: string | null;
  createdAt: string;
}

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  icon: string | null;
  status: string;
  notes: string | null;
  progress: number;
  remainingAmount: number;
  monthlyTarget: number;
  createdAt: string;
  contributions: SavingsContribution[];
}

interface SavingsGoalsData {
  savingsGoals: SavingsGoal[];
}

export default function SavingsPage() {
  const router = useRouter();
  const { data, loading } = useQuery<SavingsGoalsData>(GET_SAVINGS_GOALS);
  const [fabOpen, setFabOpen] = useState(false);
  const [emojis, setEmojis] = useState<Record<string, string>>({});

  const goals: SavingsGoal[] = data?.savingsGoals || [];

  useEffect(() => {
    const items = data?.savingsGoals || [];
    if (items.length > 0) {
      const map: Record<string, string> = {};
      items.forEach((g) => {
        const emoji = getSavingsEmoji(g.id);
        if (emoji) map[g.id] = emoji;
      });
      setEmojis(map);
    }
  }, [data]);
  const activeGoals = goals.filter((g) => g.status === "ACTIVE");
  const completedGoals = goals.filter((g) => g.status === "COMPLETED");
  const cancelledGoals = goals.filter((g) => g.status === "CANCELLED");

  const totalSaved = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tabungan</h1>
            <p className="text-muted-foreground hidden sm:block">Kelola target tabungan kamu</p>
          </div>
          <Button asChild className="w-fit hidden md:inline-flex">
            <Link href="/savings/new">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Tabungan
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="bg-card border-1">
            <CardHeader>
              <CardTitle className="flex flex-col gap-4 items-start">
                <span className="text-primary">Total Terkumpul</span>
                <span className="text-2xl text-savings">{formatIDR(totalSaved)}</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {activeGoals.length} tabungan aktif
              </p>
            </CardHeader>
          </Card>

          <Card className="bg-card border-1">
            <CardHeader>
              <CardTitle className="flex flex-col gap-4 items-start">
                <span className="text-primary">Sisa Target</span>
                <span className="text-2xl text-savings">{formatIDR(totalTarget - totalSaved)}</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Dari total target {formatIDR(totalTarget)}
              </p>
            </CardHeader>
          </Card>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <div className="grid gap-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-12 w-12 rounded-lg" />
                          <div className="space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-40" />
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <Skeleton className="h-5 w-28 ml-auto" />
                          <Skeleton className="h-4 w-24 ml-auto" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : goals.length > 0 ? (
          <div className="space-y-6">
            {activeGoals.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-savings" />
                  Tabungan Aktif ({activeGoals.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeGoals.map((goal) => (
                    <Card
                      key={goal.id}
                      className="cursor-pointer hover:border-accent transition-colors py-0"
                      onClick={() => router.push(`/savings/${goal.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex mb-3">
                          <div className="h-8 w-8 rounded-lg bg-savings/10 flex items-center justify-center">
                            {emojis[goal.id] ? (
                              <span className="text-lg">{emojis[goal.id]}</span>
                            ) : (
                              <PiggyBank className="h-4 w-4 text-savings" />
                            )}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-semibold">{goal.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Target: {formatDateShortID(goal.targetDate)}
                            </p>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">
                                {formatIDR(goal.currentAmount)}
                              </span>
                              <span className="font-medium">
                                {Math.round(goal.progress)}%
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-savings h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(goal.progress, 100)}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              dari {formatIDR(goal.targetAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Target bulanan: <span className="text-savings font-medium">{formatIDR(goal.monthlyTarget)}</span>
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {completedGoals.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-income" />
                  Tabungan Selesai ({completedGoals.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {completedGoals.map((goal) => (
                    <Card
                      key={goal.id}
                      className="cursor-pointer hover:border-accent transition-colors opacity-70 py-0"
                      onClick={() => router.push(`/savings/${goal.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex mb-3">
                          <div className="h-8 w-8 rounded-lg bg-income/10 flex items-center justify-center">
                            {emojis[goal.id] ? (
                              <span className="text-lg">{emojis[goal.id]}</span>
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-income" />
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <h3 className="font-semibold">{goal.name}</h3>
                            <p className="text-sm text-muted-foreground">Tercapai</p>
                          </div>
                          <div>
                            <p className="font-bold text-income">Selesai</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Terkumpul {formatIDR(goal.currentAmount)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {cancelledGoals.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  Tabungan Dibatalkan ({cancelledGoals.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {cancelledGoals.map((goal) => (
                    <Card
                      key={goal.id}
                      className="cursor-pointer hover:border-accent transition-colors opacity-50 py-0"
                      onClick={() => router.push(`/savings/${goal.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex mb-3">
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                            {emojis[goal.id] ? (
                              <span className="text-lg">{emojis[goal.id]}</span>
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-semibold">{goal.name}</h3>
                          <p className="text-sm text-muted-foreground">Dibatalkan</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <PiggyBank className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">Belum ada tabungan</p>
              <p className="text-xs mt-1">
                Klik tombol Tambah Tabungan untuk mulai menabung
              </p>
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
                href="/savings/new"
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
