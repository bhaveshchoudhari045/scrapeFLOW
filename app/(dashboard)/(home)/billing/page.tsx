import { GetAvailableCredits } from "@/actions/billing/getAvailableCredits";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import ReactCountUpWrapper from "@/components/ReactCountUpWrapper";
import { CoinsIcon, ArrowLeftRightIcon, ShieldCheckIcon } from "lucide-react";
import CreditsPurchase from "./_components/CreditsPurchase";
import { GetCreditUsageInPeriod } from "@/actions/analytics/getCreditUsageInperiod";
import { Period } from "@/types/analytics";
import CreditUsageChart from "./_components/CreditUsageChart";
import { GetUserPurchaseHistory } from "@/actions/billing/getUserPurchaseHistory";
import InvoiceBtn from "./_components/invoiceBtn";


export default function BillingPage() {
  return (
    <div className="page-content">
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Billing</h1>
          <p className="pg-subtitle">
            Manage your credits and purchase history
          </p>
        </div>
      </div>

      <Suspense
        fallback={<Skeleton className="h-[140px] w-full rounded-2xl" />}
      >
        <BalanceCard />
      </Suspense>

      <CreditsPurchase />

      <Suspense
        fallback={<Skeleton className="h-[320px] w-full rounded-2xl" />}
      >
        <CreditUsageCard />
      </Suspense>

      <Suspense
        fallback={<Skeleton className="h-[300px] w-full rounded-2xl" />}
      >
        <TransactionHistoryCard />
      </Suspense>
    </div>
  );
}

async function BalanceCard() {
  const userBalance = await GetAvailableCredits();
  return (
    <div className="balance-card">
      <div className="balance-card-left">
        <div className="balance-card-label">Available Credits</div>
        <div className="balance-card-value">
          <ReactCountUpWrapper value={userBalance} />
        </div>
        <div className="balance-card-note">
          When your credit balance reaches zero, your workflows will stop
          working.
        </div>
      </div>
      <div className="balance-card-watermark">
        <CoinsIcon size={120} />
      </div>
    </div>
  );
}

async function CreditUsageCard() {
  const period: Period = {
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  };
  const data = await GetCreditUsageInPeriod(period);
  return (
    <div className="chart-card" style={{ marginBottom: "1.5rem" }}>
      <div className="chart-card-header">
        <div className="chart-card-icon">
          <CoinsIcon size={18} strokeWidth={1.75} />
        </div>
        <div>
          <div className="chart-card-title">Credits consumed</div>
          <div className="chart-card-sub">
            Daily credit usage in the current month
          </div>
        </div>
      </div>
      <CreditUsageChart
        data={data}
        title="Credits consumed"
        description="Daily credit consumed in the current month"
      />
    </div>
  );
}

async function TransactionHistoryCard() {
  const purchases = await GetUserPurchaseHistory();
  return (
    <div
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "1.5rem",
      }}
    >
      <div className="section-header">
        <div className="section-header-icon">
          <ArrowLeftRightIcon size={18} strokeWidth={1.75} />
        </div>
        <div>
          <div className="section-header-title">Transaction History</div>
          <div className="section-header-sub">
            View transactions and download invoices
          </div>
        </div>
      </div>

      {purchases.length === 0 ? (
        <div
          className="empty-state"
          style={{ minHeight: 160, paddingTop: "2rem", paddingBottom: "2rem" }}
        >
          <div className="empty-state-title">No transactions yet</div>
          <div className="empty-state-sub">
            Your purchase history will appear here.
          </div>
        </div>
      ) : (
        purchases.map((purchase) => (
          <div key={purchase.id} className="tx-row">
            <div>
              <div className="tx-date">{formatDate(purchase.date)}</div>
              <div className="tx-desc">{purchase.description}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div className="tx-amount">
                {formatAmount(purchase.amount, purchase.currency)}
              </div>
              <InvoiceBtn id={purchase.id} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatAmount(amount: string, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(Number(amount) / 100);
}
