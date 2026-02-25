"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils/currency";
import { GET_POCKETS } from "@/lib/graphql/queries";
import { Plus, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getContrastStyles } from "@/lib/utils/color";

const GET_POCKET_ENTRIES = gql`
  query GetPocketEntries($pocketId: UUID!) {
    pocketEntries(pocketId: $pocketId) {
      id
      transactionDate
      debit
      credit
    }
  }
`;

interface Pocket {
  id: string;
  name: string;
  currentBalance: number;
  isDefault: boolean;
  isPocket: boolean;
  icon: string | null;
  cardBgColor: string | null;
  sortOrder: number;
  createdAt: string;
}

interface PocketsData {
  pockets: Pocket[];
}

interface PocketEntry {
  id: string;
  transactionDate: string;
  debit: number;
  credit: number;
}

interface PocketEntriesData {
  pocketEntries: PocketEntry[];
}

function PocketCard({ pocket, onClick }: { pocket: Pocket; onClick: () => void }) {
  const c = getContrastStyles(pocket.cardBgColor);
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const { data: entriesData } = useQuery<PocketEntriesData>(GET_POCKET_ENTRIES, {
    variables: { pocketId: pocket.id },
  });

  const monthlyBalance = useMemo(() => {
    const entries = entriesData?.pocketEntries || [];
    return entries
      .filter((e) => e.transactionDate.slice(0, 7) === currentMonth)
      .reduce((sum, e) => sum + e.debit - e.credit, 0);
  }, [entriesData, currentMonth]);

  return (
    <Card
      className="cursor-pointer hover:border-accent transition-colors py-0"
      onClick={onClick}
      style={pocket.cardBgColor ? { backgroundColor: pocket.cardBgColor, borderColor: pocket.cardBgColor } : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center justify-between w-full gap-2">
            {pocket.icon ? (
              <span className="text-2xl">{pocket.icon}</span>
            ) : (
              <Wallet className={cn("size-5", c.bold || "text-primary")} />
            )}
            {pocket.isDefault && (
              <Badge variant="default" className="text-xs">Utama</Badge>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <h3 className={cn("font-semibold text-sm md:text-lg", c.text)}>{pocket.name}</h3>
          <h4 className={cn("font-bold text-md md:text-xl", c.bold || "text-primary")}>
            {formatIDR(monthlyBalance)}
          </h4>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PocketsPage() {
  const router = useRouter();
  const { data, loading } = useQuery<PocketsData>(GET_POCKETS);

  const pockets: Pocket[] = data?.pockets || [];
  const totalBalance = pockets.reduce((sum, p) => sum + p.currentBalance, 0);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Pocket</h1>
            <p className="text-muted-foreground hidden sm:block">Kelola kantong uang kamu</p>
          </div>
          <Button asChild className="w-fit hidden md:inline-flex">
            <Link href="/pockets/new">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Pocket
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        ) : pockets.length > 0 ? (
          <div className="space-y-6">
            <Card className="bg-card border-1 py-4 md:py-6">
              <CardContent className="flex flex-col items-start md:gap-4 gap-3 w-full px-4 md:px-6">
                <p className="text-primary text-sm md:text-lg">Total Saldo</p>
                <h1 className="text-md sm:text-2xl font-bold">{formatIDR(totalBalance)}</h1>
              </CardContent>
            </Card>

            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              {pockets.map((pocket) => (
                <PocketCard
                  key={pocket.id}
                  pocket={pocket}
                  onClick={() => router.push(`/pockets/${pocket.id}`)}
                />
              ))}
            </div>
          </div>
        ) : (
          <Card className="py-0">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center mb-4">
                Belum ada pocket. Buat pocket pertama kamu!
              </p>
              <Button asChild>
                <Link href="/pockets/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Pocket
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

    {/* Floating Action Button - Mobile Only */}
    <div className="fixed bottom-28 right-6 z-[60] md:hidden">
      <Link
        href="/pockets/new"
        className="flex items-center justify-center w-14 h-14 rounded-full shadow-lg bg-primary text-primary-foreground"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
    </>
  );
}
