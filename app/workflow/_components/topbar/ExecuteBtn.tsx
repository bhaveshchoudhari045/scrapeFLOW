"use client";

import { RunWorkflow } from "@/actions/workflows/runWorkflow";
import { toast } from "sonner";
import useExecutionPlan from "@/components/hooks/useExecutionPlan";
import { useMutation } from "@tanstack/react-query";
import { PlayIcon } from "lucide-react";
import React from "react";
import { useReactFlow } from "@xyflow/react";
import { ThemedButton } from "./ThemedButton";

export default function ExecuteBtn({ workflowId }: { workflowId: string }) {
  const generate = useExecutionPlan();
  const { toObject } = useReactFlow();

  const mutation = useMutation({
    mutationFn: async (data: { workflowId: string; flowDefinition: string }) =>
      await RunWorkflow(data),
    onSuccess: () => {
      toast.success("Workflow execution started", { id: workflowId });
    },
    onError: (error) => {
      console.log("error:", error);
      toast.error("Something went wrong", { id: workflowId });
    },
  });

  return (
    <ThemedButton
      variant="ghost"
      loading={mutation.isPending}
      icon={<PlayIcon size={14} />}
      onClick={() => {
        const plan = generate();
        if (!plan) return;
        toast.loading("Executing workflow...", { id: workflowId });
        const flowdef = JSON.parse(JSON.stringify(toObject()));
        mutation.mutate({
          workflowId,
          flowDefinition: JSON.stringify(flowdef),
        });
      }}
    >
      Execute
    </ThemedButton>
  );
}
