import { GetPeriods } from "@/actions/analytics/getPeriods";
import React, { Suspense } from "react";
import PeriodSelector from "../_components/PeriodSelector";
import { Period } from "@/types/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { GetStatsCardsValues } from "@/actions/analytics/getStatsCardsValues";
import { CirclePlayIcon, CoinsIcon, WaypointsIcon } from "lucide-react";
import StatsCard from "../_components/StatsCard";
import { GetWorkflowExecutionStats } from "@/actions/analytics/getWorkflowExecutionStats";
import ExecutionStatusChart from "../_components/ExecutionStatusChart";
import { GetCreditUsageInPeriod } from "@/actions/analytics/getCreditUsageInperiod";
import CreditUsageChart from "../billing/_components/CreditUsageChart";

function HomePage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string };
}) {
  const currentDate = new Date();
  const { month, year } = searchParams;
  const period: Period = {
    month: month ? parseInt(month) : currentDate.getMonth(),
    year: year ? parseInt(year) : currentDate.getFullYear(),
  };

  return (
    <div className="page-content">
      {/* Header */}
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
        fallback={<Skeleton className="w-full h-[320px] rounded-2xl" />}
      >
        <StatsExecutionStatus selectedPeriod={period} />
      </Suspense>

      {/* Credits Usage Chart */}
      <Suspense
        fallback={<Skeleton className="w-full h-[320px] rounded-2xl" />}
      >
        <CreditsUsageInPeriod selectedPeriod={period} />
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
        <div className="stat-card-value">{data.workflowExecutions}</div>
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
        <div className="stat-card-value">{data.phaseExecutions}</div>
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
        <div className="stat-card-value">{data.creditsConsumed}</div>
        <CoinsIcon size={80} className="stat-card-watermark" strokeWidth={1} />
      </div>
    </div>
  );
}

async function StatsExecutionStatus({
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

async function CreditsUsageInPeriod({
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
