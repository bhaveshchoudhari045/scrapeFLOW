import { GetWorkflowsForUser } from "@/actions/workflows/getWorkflowsForUser";
import { Skeleton } from "@/components/ui/skeleton";
import React, { Suspense } from "react";
import {
  AlertCircle,
  InboxIcon,
  Plus,
  PlayIcon,
  PencilIcon,
  MoreHorizontalIcon,
} from "lucide-react";
import CreateWorkflowDialog from "./_components/CreateWorkflowDialog";
import WorkflowCard from "./_components/WorkflowCard";

function WorkflowsPage() {
  return (
    <div className="page-content">
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Workflows</h1>
          <p className="pg-subtitle">
            Build and manage your scraping workflows
          </p>
        </div>
        <CreateWorkflowDialog defaultOpen={false}>
          <button className="create-btn">
            <Plus size={16} strokeWidth={2} />
            Create workflow
          </button>
        </CreateWorkflowDialog>
      </div>

      <Suspense fallback={<UserWorkflowsSkeleton />}>
        <UserWorkflows />
      </Suspense>
    </div>
  );
}

function UserWorkflowsSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-[88px] w-full rounded-2xl" />
      ))}
    </div>
  );
}

async function UserWorkflows() {
  const workflows = await GetWorkflowsForUser();

  if (!workflows) {
    return (
      <div
        style={{
          background: "rgba(239,68,68,0.06)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 14,
          padding: "1.25rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <AlertCircle size={18} style={{ color: "#ef4444", flexShrink: 0 }} />
        <div>
          <div
            style={{ fontSize: "0.875rem", fontWeight: 600, color: "#ef4444" }}
          >
            Error
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--tx2)" }}>
            Something went wrong. Please try again later.
          </div>
        </div>
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <InboxIcon size={28} strokeWidth={1.5} />
        </div>
        <div className="empty-state-title">No workflows yet</div>
        <div className="empty-state-sub">
          Create your first workflow to start scraping data from the web.
        </div>
        <CreateWorkflowDialog triggerText="Create your first workflow" />
      </div>
    );
  }

  return (
    <div>
      {workflows.map((workflow) => (
        <WorkflowCard key={workflow.id} workflow={workflow} />
      ))}
    </div>
  );
}

export default WorkflowsPage;
