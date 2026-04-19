"use client";

import { GetWorkflowExecutionWithPhases } from "@/actions/workflows/getWorkflowExecutionWithPhases";
import { Separator } from "@/components/ui/separator";
import {
  ExecutionPhaseStatus,
  WorkflowExecutionStatus,
} from "@/types/workflow";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  CalendarIcon,
  CircleDashedIcon,
  ClockIcon,
  CoinsIcon,
  FileDownIcon,
  Loader2Icon,
  LucideIcon,
  WorkflowIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ReactNode, useEffect, useState } from "react";
import { DatesToDurationString } from "@/lib/helper/dates";
import { GetPhaseTotalCost } from "@/lib/helper/phases";
import { GetWorkflowPhaseDetails } from "@/actions/workflows/getWorkflowPhaseDetails";
import { Input } from "@/components/ui/input";
import { ExecutionLog } from "@prisma/client";
import { cn } from "@/lib/utils";
import { LogLevel } from "@/types/log";
import PhaseStatusBadge from "./PhaseStatusBadge";
import ReactCountUpWrapper from "@/components/ReactCountUpWrapper";

type ExecutionData = Awaited<ReturnType<typeof GetWorkflowExecutionWithPhases>>;

export default function ExecutionViewer({
  initialData,
}: {
  initialData: ExecutionData;
}) {
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["execution", initialData?.id],
    initialData,
    queryFn: () => GetWorkflowExecutionWithPhases(initialData!.id),
    refetchInterval: (q) =>
      q.state.data?.status === WorkflowExecutionStatus.RUNNING ? 1000 : false,
  });

  const phaseDetails = useQuery({
    queryKey: ["phaseDetails", selectedPhase, query.data?.status],
    enabled: selectedPhase !== null,
    queryFn: () => GetWorkflowPhaseDetails(selectedPhase!),
  });

  const isRunning = query.data?.status === WorkflowExecutionStatus.RUNNING;

  useEffect(() => {
    const phases = query.data?.phases || [];
    const phaseToSelect = phases.toSorted((a, b) =>
      a.startedAt! > b.startedAt! ? -1 : 1,
    )[0];
    if (phaseToSelect) setSelectedPhase(phaseToSelect.id);
  }, [query.data?.phases, isRunning]);

  const duration = DatesToDurationString(
    query.data?.startedAt,
    query.data?.completedAt,
  );
  const creditsConsumed = GetPhaseTotalCost(query.data?.phases || []);

  // Check if the currently selected phase has CSV output
  const hasCsvOutput = (() => {
    try {
      if (!phaseDetails.data?.outputs) return false;
      const outputs = JSON.parse(phaseDetails.data.outputs);
      return !!outputs["CSV Content"];
    } catch {
      return false;
    }
  })();

  return (
    <div className="flex w-full h-full" style={{ background: "var(--bg-2)" }}>
      {/* ── Left sidebar ── */}
      <aside
        className="flex flex-col overflow-hidden flex-shrink-0"
        style={{
          width: 400,
          minWidth: 400,
          maxWidth: 400,
          background: "var(--bg-card)",
          boxShadow:
            "2px 0 16px rgba(0,0,0,0.07), 1px 0 0 var(--rule), 2px 0 8px var(--p-glow)",
        }}
      >
        {/* Execution meta */}
        <div style={{ padding: "0.75rem 0", borderBottom: "none" }}>
          <ExectionLabel
            icon={CircleDashedIcon}
            label="Status"
            value={
              <div
                className="flex gap-2 items-center"
                style={{ fontWeight: 600 }}
              >
                <PhaseStatusBadge
                  status={query.data?.status as ExecutionPhaseStatus}
                />
                <span
                  style={{ color: "var(--tx1)", textTransform: "capitalize" }}
                >
                  {query.data?.status}
                </span>
              </div>
            }
          />
          <ExectionLabel
            icon={CalendarIcon}
            label="Started At"
            value={
              <span style={{ color: "var(--tx2)", textTransform: "lowercase" }}>
                {query.data?.startedAt
                  ? formatDistanceToNow(new Date(query.data.startedAt), {
                      addSuffix: true,
                    })
                  : "—"}
              </span>
            }
          />
          <ExectionLabel
            icon={ClockIcon}
            label="Duration"
            value={
              duration ? (
                <span
                  style={{
                    color: "var(--tx2)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {duration}
                </span>
              ) : (
                <Loader2Icon
                  className="animate-spin"
                  size={16}
                  style={{ color: "var(--primary)" }}
                />
              )
            }
          />
          <ExectionLabel
            icon={CoinsIcon}
            label="Credits"
            value={
              <span
                style={{
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  background:
                    "linear-gradient(135deg, var(--primary-lt), var(--primary-dp))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                <ReactCountUpWrapper value={creditsConsumed} />
              </span>
            }
          />
        </div>

        {/* Phases header */}
        <div
          style={{
            boxShadow: "0 1px 0 var(--rule), inset 0 -1px 0 var(--rule)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.625rem 1rem",
            }}
          >
            <WorkflowIcon size={16} style={{ color: "var(--primary)" }} />
            <span
              style={{
                fontWeight: 700,
                fontSize: "0.8125rem",
                color: "var(--tx1)",
                fontFamily: "var(--font-display)",
              }}
            >
              Execution Phases
            </span>
          </div>
        </div>

        {/* Phase list */}
        <div style={{ overflowY: "auto", flex: 1, padding: "0.5rem 0.625rem" }}>
          {query.data?.phases.map((phase, index) => {
            const isActive = selectedPhase === phase.id;
            return (
              <button
                key={phase.id}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "var(--r-sm)",
                  marginBottom: "0.25rem",
                  background: isActive ? "var(--p-dim)" : "transparent",
                  border: isActive
                    ? "1px solid hsl(var(--p-h,38) var(--p-s,96%) var(--p-l,52%) / 0.22)"
                    : "1px solid transparent",
                  boxShadow: isActive ? "0 2px 8px var(--p-glow)" : "none",
                  cursor: isRunning ? "not-allowed" : "pointer",
                  transition: "all 0.18s ease",
                  color: isActive ? "var(--primary)" : "var(--tx2)",
                  fontWeight: isActive ? 700 : 400,
                  position: "relative",
                }}
                onClick={() => {
                  if (!isRunning) setSelectedPhase(phase.id);
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--p-dim)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                }}
              >
                {/* Active bar */}
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "20%",
                      bottom: "20%",
                      width: 3,
                      borderRadius: 2,
                      background:
                        "linear-gradient(180deg, var(--primary-lt), var(--primary-dp))",
                      boxShadow: "0 0 8px var(--primary-glow)",
                    }}
                  />
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.625rem",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: isActive ? "var(--primary)" : "var(--bg-3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      color: isActive ? "#fff" : "var(--tx3)",
                      fontFamily: "var(--font-mono)",
                      boxShadow: isActive
                        ? "0 2px 6px var(--primary-glow)"
                        : "none",
                    }}
                  >
                    {index + 1}
                  </span>
                  <span style={{ fontSize: "0.8125rem" }}>{phase.name}</span>
                </div>
                <PhaseStatusBadge
                  status={phase.status as ExecutionPhaseStatus}
                />
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Right detail panel ── */}
      <div
        className="flex w-full h-full overflow-auto"
        style={{ background: "var(--bg-2)" }}
      >
        {isRunning && (
          <div className="flex items-center flex-col gap-3 justify-center h-full w-full">
            <Loader2Icon
              size={32}
              className="animate-spin"
              style={{ color: "var(--primary)" }}
            />
            <p style={{ fontWeight: 700, color: "var(--tx2)" }}>
              Run is in progress, please wait…
            </p>
          </div>
        )}
        {!isRunning && !selectedPhase && (
          <div className="flex items-center flex-col gap-2 justify-center h-full w-full">
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "var(--r-lg)",
                background:
                  "linear-gradient(135deg, var(--p-dim), var(--a-dim))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px var(--p-glow)",
              }}
            >
              <WorkflowIcon size={24} style={{ color: "var(--primary)" }} />
            </div>
            <p style={{ fontWeight: 700, color: "var(--tx1)" }}>
              No phase selected
            </p>
            <p style={{ fontSize: "0.875rem", color: "var(--tx3)" }}>
              Select a phase to view details
            </p>
          </div>
        )}
        {!isRunning && selectedPhase && phaseDetails.data && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              padding: "1.5rem",
              width: "100%",
              maxWidth: 860,
            }}
          >
            {/* Credits + Duration + CSV Download badges row */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {[
                {
                  icon: CoinsIcon,
                  label: "Credits",
                  value: phaseDetails.data.creditsConsumed,
                },
                {
                  icon: ClockIcon,
                  label: "Duration",
                  value:
                    DatesToDurationString(
                      phaseDetails.data.startedAt,
                      phaseDetails.data.completedAt,
                    ) || "—",
                },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.4rem 0.875rem",
                    background: "var(--p-dim)",
                    border:
                      "1px solid hsl(var(--p-h,38) var(--p-s,96%) var(--p-l,52%) / 0.22)",
                    borderRadius: "var(--r-pill)",
                    boxShadow: "0 2px 6px var(--p-glow)",
                    fontSize: "0.8125rem",
                    color: "var(--primary)",
                    fontWeight: 600,
                  }}
                >
                  <Icon size={14} style={{ color: "var(--primary)" }} />
                  <span>{label}:</span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>
                    {value}
                  </span>
                </div>
              ))}

              {/* CSV download button — only visible on Export to CSV phase */}
              {hasCsvOutput && selectedPhase && (
                <CSVDownloadButton phaseId={selectedPhase} />
              )}
            </div>

            <ParamaterViewer
              title="Inputs"
              subTitle="Inputs used for this phase"
              paramsJson={phaseDetails.data.inputs}
            />
            <ParamaterViewer
              title="Outputs"
              subTitle="Outputs generated by this phase"
              paramsJson={phaseDetails.data.outputs}
            />
            <LogViewer logs={phaseDetails.data.logs} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── CSV Download Button ──
function CSVDownloadButton({ phaseId }: { phaseId: string }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/download-csv?phaseId=${phaseId}`);
      if (!response.ok) {
        alert("CSV not available for this phase.");
        return;
      }
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+?)"/);
      const filename = match ? match[1] : "export.csv";

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.4rem 1rem",
        background: "var(--p-dim)",
        border:
          "1px solid hsl(var(--p-h,38) var(--p-s,96%) var(--p-l,52%) / 0.22)",
        borderRadius: "var(--r-pill)",
        boxShadow: "0 2px 6px var(--p-glow)",
        fontSize: "0.8125rem",
        color: "var(--primary)",
        fontWeight: 600,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {loading ? (
        <Loader2Icon size={14} className="animate-spin" />
      ) : (
        <FileDownIcon size={14} />
      )}
      {loading ? "Downloading..." : "Download CSV"}
    </button>
  );
}

function ExectionLabel({
  icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: ReactNode;
  value: ReactNode;
}) {
  const Icon = icon;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0.5rem 1rem",
        fontSize: "0.8125rem",
        boxShadow: "0 1px 0 var(--rule)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          color: "var(--tx3)",
        }}
      >
        <Icon size={15} style={{ color: "var(--tx3)" }} />
        <span>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {value}
      </div>
    </div>
  );
}

function ParamaterViewer({
  title,
  subTitle,
  paramsJson,
}: {
  title: string;
  subTitle: string;
  paramsJson: string | null;
}) {
  const params = paramsJson ? JSON.parse(paramsJson) : undefined;
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--sh-md)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "0.875rem 1.25rem",
          background: "var(--bg-2)",
          boxShadow: "0 1px 0 var(--rule)",
        }}
      >
        <div
          style={{
            fontSize: "0.9rem",
            fontWeight: 700,
            color: "var(--tx1)",
            fontFamily: "var(--font-display)",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: "0.775rem",
            color: "var(--tx3)",
            marginTop: "0.1rem",
          }}
        >
          {subTitle}
        </div>
      </div>
      <div style={{ padding: "1rem 1.25rem" }}>
        {!params || Object.keys(params).length === 0 ? (
          <p style={{ fontSize: "0.8125rem", color: "var(--tx3)" }}>
            No parameters generated by this phase
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.625rem",
            }}
          >
            {Object.entries(params).map(([key, value]) => (
              <div
                key={key}
                style={{ display: "flex", alignItems: "center", gap: "1rem" }}
              >
                <span
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--tx2)",
                    flex: "0 0 33%",
                  }}
                >
                  {key}
                </span>
                <Input
                  readOnly
                  value={value as string}
                  style={{
                    flex: "1",
                    background: "var(--bg-2)",
                    color: "var(--tx1)",
                    borderColor: "var(--rule2)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.8125rem",
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LogViewer({ logs }: { logs: ExecutionLog[] | undefined }) {
  if (!logs || logs.length === 0) return null;
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--sh-md)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "0.875rem 1.25rem",
          background: "var(--bg-2)",
          boxShadow: "0 1px 0 var(--rule)",
        }}
      >
        <div
          style={{
            fontSize: "0.9rem",
            fontWeight: 700,
            color: "var(--tx1)",
            fontFamily: "var(--font-display)",
          }}
        >
          Logs
        </div>
        <div
          style={{
            fontSize: "0.775rem",
            color: "var(--tx3)",
            marginTop: "0.1rem",
          }}
        >
          Generated by this phase
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.8rem",
          }}
        >
          <thead>
            <tr>
              {["Timestamp", "Level", "Message"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "0.5rem 1rem",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--tx3)",
                    boxShadow: "0 1px 0 var(--rule)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr
                key={log.id}
                style={{ transition: "background 0.15s" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-2)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <td
                  style={{
                    padding: "0.4rem 1rem",
                    color: "var(--tx3)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.72rem",
                    boxShadow: "0 1px 0 var(--rule)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {log.timestamp.toISOString()}
                </td>
                <td
                  style={{
                    padding: "0.4rem 1rem",
                    fontWeight: 700,
                    fontSize: "0.72rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    boxShadow: "0 1px 0 var(--rule)",
                    color:
                      (log.logLevel as LogLevel) === "error"
                        ? "#ef4444"
                        : (log.logLevel as LogLevel) === "info"
                          ? "var(--primary)"
                          : "var(--tx3)",
                  }}
                >
                  {log.logLevel}
                </td>
                <td
                  style={{
                    padding: "0.4rem 1rem",
                    color: "var(--tx2)",
                    boxShadow: "0 1px 0 var(--rule)",
                  }}
                >
                  {log.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
