// ─── app/(dashboard)/page.tsx ────────────────────────────────────────────────
// FIX: removed StatsCard shadcn Card wrapper (now uses stat-card CSS class)
// FIX: removed chart shadcn Card wrapper (now uses chart-card CSS class)
// FIX: full-width — no max-width container
import { GetPeriods } from "@/actions/analytics/getPeriods";
import React, { Suspense } from "react";
import PeriodSelector from "@/app/(dashboard)/(home)/_components/PeriodSelector";
import { Period } from "@/types/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { GetStatsCardsValues } from "@/actions/analytics/getStatsCardsValues";
import { CirclePlayIcon, CoinsIcon, WaypointsIcon } from "lucide-react";
import { GetWorkflowExecutionStats } from "@/actions/analytics/getWorkflowExecutionStats";
import ExecutionStatusChart from "@/app/(dashboard)/(home)/_components/ExecutionStatusChart";
import { GetCreditUsageInPeriod } from "@/actions/analytics/getCreditUsageInperiod";
import CreditUsageChart from "@/app/(dashboard)/(home)/billing/_components/CreditUsageChart";
import ReactCountUpWrapper from "@/components/ReactCountUpWrapper";

function HomePage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string };
}) {
  const currentDate = new Date();
  const period: Period = {
    month: searchParams.month
      ? parseInt(searchParams.month)
      : currentDate.getMonth(),
    year: searchParams.year
      ? parseInt(searchParams.year)
      : currentDate.getFullYear(),
  };

  return (
    <div className="page-content">
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Dashboard</h1>
          <p className="pg-subtitle">
            Monitor your workflow activity and credit usage
          </p>
        </div>
        <Suspense
          fallback={<Skeleton className="w-[180px] h-[38px] rounded-lg" />}
        >
          <PeriodSelectorWrapper selectedPeriod={period} />
        </Suspense>
      </div>

      {/* Stat Cards */}
      <Suspense
        fallback={
          <div className="stat-grid">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[130px] rounded-2xl" />
            ))}
          </div>
        }
      >
        <StatsCards selectedPeriod={period} />
      </Suspense>

      {/* Execution Status Chart */}
      <Suspense
        fallback={<Skeleton className="w-full h-[320px] rounded-2xl mb-6" />}
      >
        <ExecutionStatusWrapper selectedPeriod={period} />
      </Suspense>

      {/* Credits Usage Chart */}
      <Suspense
        fallback={<Skeleton className="w-full h-[320px] rounded-2xl" />}
      >
        <CreditUsageWrapper selectedPeriod={period} />
      </Suspense>
    </div>
  );
}

async function PeriodSelectorWrapper({
  selectedPeriod,
}: {
  selectedPeriod: Period;
}) {
  const periods = await GetPeriods();
  return <PeriodSelector selectedPeriod={selectedPeriod} periods={periods} />;
}

async function StatsCards({ selectedPeriod }: { selectedPeriod: Period }) {
  const data = await GetStatsCardsValues(selectedPeriod);
  return (
    <div className="stat-grid">
      <div className="stat-card">
        <div className="stat-card-icon">
          <CirclePlayIcon size={20} strokeWidth={1.75} />
        </div>
        <div className="stat-card-label">Workflow Executions</div>
        <div className="stat-card-value">
          <ReactCountUpWrapper value={data.workflowExecutions} />
        </div>
        <CirclePlayIcon
          size={80}
          className="stat-card-watermark"
          strokeWidth={1}
        />
      </div>
      <div className="stat-card">
        <div className="stat-card-icon">
          <WaypointsIcon size={20} strokeWidth={1.75} />
        </div>
        <div className="stat-card-label">Phase Executions</div>
        <div className="stat-card-value">
          <ReactCountUpWrapper value={data.phaseExecutions} />
        </div>
        <WaypointsIcon
          size={80}
          className="stat-card-watermark"
          strokeWidth={1}
        />
      </div>
      <div className="stat-card">
        <div className="stat-card-icon">
          <CoinsIcon size={20} strokeWidth={1.75} />
        </div>
        <div className="stat-card-label">Credits Consumed</div>
        <div className="stat-card-value">
          <ReactCountUpWrapper value={data.creditsConsumed} />
        </div>
        <CoinsIcon size={80} className="stat-card-watermark" strokeWidth={1} />
      </div>
    </div>
  );
}

async function ExecutionStatusWrapper({
  selectedPeriod,
}: {
  selectedPeriod: Period;
}) {
  const data = await GetWorkflowExecutionStats(selectedPeriod);
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div className="chart-card-icon">
          <WaypointsIcon size={18} strokeWidth={1.75} />
        </div>
        <div>
          <div className="chart-card-title">Workflow execution status</div>
          <div className="chart-card-sub">
            Daily successful and failed executions
          </div>
        </div>
      </div>
      <ExecutionStatusChart data={data} />
    </div>
  );
}

async function CreditUsageWrapper({
  selectedPeriod,
}: {
  selectedPeriod: Period;
}) {
  const data = await GetCreditUsageInPeriod(selectedPeriod);
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div className="chart-card-icon">
          <CoinsIcon size={18} strokeWidth={1.75} />
        </div>
        <div>
          <div className="chart-card-title">Daily credits spent</div>
          <div className="chart-card-sub">
            Daily credit consumed in selected period
          </div>
        </div>
      </div>
      <CreditUsageChart
        data={data}
        title="Daily credits spent"
        description="Daily credit consumed in selected period"
      />
    </div>
  );
}

export default HomePage;
