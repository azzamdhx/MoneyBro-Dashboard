"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIDR } from "@/lib/utils/currency";
import { BarChart3 } from "lucide-react";
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

interface CashFlowItem {
  name: string;
  value: number;
  fill: string;
  gradientColors: string[];
}

interface CategoryItem {
  name: string;
  value: number;
  fill: string;
  gradientId: string;
  gradientColors: string[];
}

interface DashboardChartsProps {
  cashFlowData: CashFlowItem[];
  categoryData: CategoryItem[];
}

export default function DashboardCharts({ cashFlowData, categoryData }: DashboardChartsProps) {
  return (
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
  );
}
