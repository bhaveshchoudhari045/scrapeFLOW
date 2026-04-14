"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import parser from "cron-parser";
import { CalendarIcon, ClockIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import CustomDialogHeader from "@/components/CustomDialogHeader";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { UpdateWorkflowCron } from "@/actions/workflows/updateWorkflowCron";
import { toast } from "sonner";
import cronstrue from "cronstrue";
import { RemoveWorkflowSchedule } from "@/actions/workflows/removeWorkflowSchedule";

export default function SchedulerDialog(props: {
  cron: string | null;
  workflowId: string;
}) {
  const [cron, setCron] = useState(props.cron || "");
  const [validCron, setValidCron] = useState(false);
  const [readableCron, setReadableCron] = useState("");

  const mutation = useMutation({
    mutationFn: (data: { id: string; cron: string }) =>
      UpdateWorkflowCron(data),
    onSuccess: () =>
      toast.success("Schedule updated successfully", { id: "cron" }),
    onError: () => toast.error("Something went wrong", { id: "cron" }),
  });

  const removeScheduleMutation = useMutation({
    mutationFn: (id: string) => RemoveWorkflowSchedule(id),
    onSuccess: () =>
      toast.success("Schedule removed successfully", { id: "cron" }),
    onError: () => toast.error("Something went wrong", { id: "cron" }),
  });

  useEffect(() => {
    try {
      parser.parseExpression(cron);
      setValidCron(true);
      setReadableCron(cronstrue.toString(cron));
    } catch {
      setValidCron(false);
    }
  }, [cron]);

  const workflowHasValidCron = props.cron && props.cron.length > 0;
  const readableSavedCron =
    workflowHasValidCron && cronstrue.toString(props.cron!);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="link"
          size="sm"
          className={cn(
            "text-sm p-0 h-auto",
            workflowHasValidCron ? "" : "text-orange-500",
          )}
          style={workflowHasValidCron ? { color: "var(--primary)" } : {}}
        >
          {workflowHasValidCron ? (
            <div className="flex items-center gap-2">
              <ClockIcon size={14} style={{ color: "var(--primary)" }} />
              <span style={{ color: "var(--primary)" }}>
                {readableSavedCron}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <TriangleAlertIcon className="h-3 w-3" />
              Set Schedule
            </div>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="px-0">
        <CustomDialogHeader
          title="Schedule workflow execution"
          icon={CalendarIcon}
        />

        <div className="p-6 space-y-4">
          {/* Description */}
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--tx3)",
              lineHeight: 1.6,
            }}
          >
            Specify a cron expression to schedule periodic workflow execution.
            All times are in UTC.
          </p>

          {/* Cron input */}
          <Input
            placeholder="E.g. 0 9 * * 1-5"
            value={cron}
            onChange={(e) => setCron(e.target.value)}
            style={{
              background: "var(--bg-2)",
              color: "var(--tx1)",
              borderColor: "var(--rule2)",
              fontFamily: "var(--font-mono)",
            }}
          />

          {/* Cron preview — themed */}
          <div
            style={{
              borderRadius: "var(--r-md)",
              padding: "0.875rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              transition: "all 0.2s ease",
              ...(validCron
                ? {
                    background: "var(--p-dim)",
                    border:
                      "1px solid hsl(var(--p-h, 38) var(--p-s, 96%) var(--p-l, 52%) / 0.28)",
                    color: "var(--primary)",
                    boxShadow: "0 2px 8px var(--p-glow)",
                  }
                : {
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    color: "#ef4444",
                  }),
            }}
          >
            {validCron ? readableCron : "Not a valid cron expression"}
          </div>

          {/* Remove schedule */}
          {workflowHasValidCron && (
            <DialogClose asChild>
              <div>
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={
                    mutation.isPending || removeScheduleMutation.isPending
                  }
                  style={{
                    color: "#ef4444",
                    borderColor: "rgba(239,68,68,0.35)",
                    background: "rgba(239,68,68,0.04)",
                  }}
                  onClick={() => {
                    toast.loading("Removing schedule...", { id: "cron" });
                    removeScheduleMutation.mutate(props.workflowId);
                  }}
                >
                  Remove current schedule
                </Button>
                <div
                  style={{
                    height: 1,
                    background: "var(--rule)",
                    margin: "1rem 0",
                  }}
                />
              </div>
            </DialogClose>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 gap-2">
          <DialogClose asChild>
            <Button
              className="w-full"
              variant="outline"
              style={{ borderColor: "var(--rule2)", color: "var(--tx2)" }}
            >
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              className="w-full"
              disabled={mutation.isPending || !validCron}
              style={{
                background:
                  "linear-gradient(135deg, var(--accent-lt), var(--accent-dp))",
                border: "none",
                boxShadow: "var(--sh-accent)",
                color: "#fff",
                fontWeight: 700,
              }}
              onClick={() => {
                toast.loading("Saving...", { id: "cron" });
                mutation.mutate({ id: props.workflowId, cron });
              }}
            >
              Save Schedule
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
