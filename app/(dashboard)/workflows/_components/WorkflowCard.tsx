"use client";

import { WorkflowExecutionStatus, WorkflowStatus } from "@/types/workflow";
import { Workflow } from "@prisma/client";
import {
  ChevronRightIcon,
  ClockIcon,
  CoinsIcon,
  CornerDownRightIcon,
  FileTextIcon,
  MoreVerticalIcon,
  MoveRightIcon,
  PlayIcon,
  ShuffleIcon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TooltipWrapper from "@/components/TooltipWrapper";
import DeleteWorkflowDialog from "@/app/(dashboard)/workflows/_components/DeleteWorkflowDialog";
import RunBtn from "./RunBtn";
import SchedulerDialog from "./SchedulerDialog";
import ExecutionStatusIndicator, {
  ExecutionStatusLabel,
} from "@/app/workflow/runs/[workflowId]/_components/ExecutionStatusIndicator";
import { formatDistanceToNow, format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import DuplicateWorkflowDialog from "./DuplicateWorkflowDialog";

function WorkflowCard({ workflow }: { workflow: Workflow }) {
  const isDraft = workflow.status === WorkflowStatus.DRAFT;

  return (
    <div className="wf-card-root">
      {/* Main row */}
      <div
        style={{
          padding: "1.125rem 1.375rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        {/* Left */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Status icon — FIXED: uses .wf-status-icon classes not dead --accent-cur */}
          <div className={`wf-status-icon ${isDraft ? "draft" : "published"}`}>
            {isDraft ? (
              <FileTextIcon size={18} strokeWidth={1.75} />
            ) : (
              <PlayIcon size={18} strokeWidth={1.75} />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.3rem",
              }}
            >
              <TooltipWrapper content={workflow.description}>
                <Link
                  href={`/workflow/editor/${workflow.id}`}
                  className="wf-name-link"
                >
                  {workflow.name}
                </Link>
              </TooltipWrapper>

              {isDraft ? (
                <span className="wf-draft-badge">Draft</span>
              ) : (
                <span className="wf-published-badge">Published</span>
              )}

              <DuplicateWorkflowDialog workflowId={workflow.id} />
            </div>

            <ScheduleSection
              isDraft={isDraft}
              creditsCost={workflow.creditsCost}
              workflowId={workflow.id}
              cron={workflow.cron}
            />
          </div>
        </div>

        {/* Right — actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flexShrink: 0,
          }}
        >
          {!isDraft && <RunBtn workflowId={workflow.id} />}
          <Link
            href={`/workflow/editor/${workflow.id}`}
            className="wf-action-btn"
          >
            <ShuffleIcon size={14} strokeWidth={1.75} />
            Edit
          </Link>
          <WorkflowActions
            workflowName={workflow.name}
            workflowId={workflow.id}
          />
        </div>
      </div>

      <LastRunDetails workflow={workflow} />
    </div>
  );
}

function WorkflowActions({
  workflowName,
  workflowId,
}: {
  workflowName: string;
  workflowId: string;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  return (
    <>
      <DeleteWorkflowDialog
        open={showDeleteDialog}
        setOpen={setShowDeleteDialog}
        workflowName={workflowName}
        workflowId={workflowId}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="wf-action-btn"
            style={{ padding: "0.35rem 0.5rem" }}
          >
            <TooltipWrapper content="More actions">
              <MoreVerticalIcon size={16} />
            </TooltipWrapper>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="wf-dropdown-content">
          <DropdownMenuLabel
            style={{
              fontSize: "0.72rem",
              color: "var(--tx3)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Actions
          </DropdownMenuLabel>
          <DropdownMenuSeparator style={{ background: "var(--rule)" }} />
          <DropdownMenuItem
            style={{
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
            onSelect={() => setShowDeleteDialog(true)}
          >
            <TrashIcon size={14} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function ScheduleSection({
  isDraft,
  creditsCost,
  workflowId,
  cron,
}: {
  isDraft: boolean;
  creditsCost: number;
  workflowId: string;
  cron: string | null;
}) {
  if (isDraft) return null;
  return (
    <div className="wf-schedule-row">
      <CornerDownRightIcon
        size={13}
        style={{ color: "var(--tx3)", flexShrink: 0 }}
      />
      <SchedulerDialog
        workflowId={workflowId}
        cron={cron}
        key={`${cron}-${workflowId}`}
      />
      <MoveRightIcon size={13} style={{ color: "var(--tx3)" }} />
      <TooltipWrapper content="Credit cost for full run">
        <span className="wf-credits-pill">
          <CoinsIcon size={11} />
          {creditsCost}
        </span>
      </TooltipWrapper>
    </div>
  );
}

function LastRunDetails({ workflow }: { workflow: Workflow }) {
  const isDraft = workflow.status === WorkflowStatus.DRAFT;
  if (isDraft) return null;

  const { lastRunAt, lastRunStatus, lastRunId, nextRunAt } = workflow;
  const formattedStartedAt = lastRunAt
    ? formatDistanceToNow(lastRunAt, { addSuffix: true })
    : null;
  const nextSchedule = nextRunAt && format(nextRunAt, "yyyy-MM-dd HH:mm");
  const nextScheduleUTC =
    nextRunAt && formatInTimeZone(nextRunAt, "UTC", "HH:mm");

  return (
    <div className="wf-lastrun">
      <div>
        {lastRunAt ? (
          <Link
            href={`/workflow/runs/${workflow.id}/${lastRunId}`}
            className="wf-lastrun-link"
          >
            <span className="wf-lastrun-label">Last run:</span>
            <ExecutionStatusIndicator
              status={lastRunStatus as WorkflowExecutionStatus}
            />
            <ExecutionStatusLabel
              status={lastRunStatus as WorkflowExecutionStatus}
            />
            <span style={{ color: "var(--tx3)" }}>{formattedStartedAt}</span>
            <ChevronRightIcon size={12} />
          </Link>
        ) : (
          <span style={{ fontSize: "0.78rem", color: "var(--tx3)" }}>
            No runs yet
          </span>
        )}
      </div>
      {nextRunAt && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            fontSize: "0.75rem",
            color: "var(--tx3)",
          }}
        >
          <ClockIcon size={11} />
          <span>Next:</span>
          <span
            style={{
              color: "var(--tx2)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.72rem",
            }}
          >
            {nextSchedule}
          </span>
          <span>({nextScheduleUTC} UTC)</span>
        </div>
      )}
    </div>
  );
}

export default WorkflowCard;
