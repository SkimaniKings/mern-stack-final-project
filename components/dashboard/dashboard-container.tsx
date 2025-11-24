"use client";

import React, { useEffect, useState } from "react";
import { subDays } from "date-fns";
import { TimeBasedFilters, DateRange } from "@/components/dashboard/time-based-filters";
import DashboardContent from "@/components/dashboard/dashboard-content";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardApiResponse {
  recentTransactions: unknown[];
  accountSummary: unknown;
  categorySpending: unknown;
  incomeExpenseData: unknown;
  transactionStats: unknown;
  cashflowForecast: unknown;
  projectedFinances: unknown;
  financialCalendarData: unknown;
  combinedTransactions: unknown;
  netWorthData: unknown;
}

export default function DashboardContainer() {
  // Default to last 30 days
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
    label: "Last 30 days",
  });
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async (range: DateRange) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard-data?from=${range.from.toISOString()}&to=${range.to.toISOString()}`
      );
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    fetchData(dateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (range: DateRange) => {
    setDateRange(range);
    fetchData(range);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card rounded-lg p-6 shadow-sm border">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Your financial overview and insights</p>
        </div>
        <TimeBasedFilters onFilterChange={handleFilterChange} />
      </div>

      {loading || !data ? (
        <Skeleton className="w-full h-96" />
      ) : (
        <DashboardContent {...data} />
      )}
    </div>
  );
}
