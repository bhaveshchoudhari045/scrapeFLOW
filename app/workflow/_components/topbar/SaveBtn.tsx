"use client";

import { UpdateWorkflow } from "@/actions/workflows/updateWorkflow";
import { useMutation } from "@tanstack/react-query";
import { useReactFlow } from "@xyflow/react";
import { CheckIcon } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { ThemedButton } from "./ThemedButton";

export default function SaveBtn({ workflowId }: { workflowId: string }) {
  const { toObject } = useReactFlow();

  const saveMutation = useMutation({
    mutationFn: async (data: { id: string; definition: string }) =>
      await UpdateWorkflow(data),
    onSuccess: () => {
      toast.success("Flow saved successfully", { id: "save-workflow" });
    },
    onError: (error) => {
      console.error("Save workflow error:", error);
      toast.error("Something went wrong", { id: "save-workflow" });
    },
  });

  return (
    <ThemedButton
      variant="primary"
      loading={saveMutation.isPending}
      icon={<CheckIcon size={14} />}
      onClick={() => {
        const flowObject = toObject();
        const workflowDefinition = JSON.stringify(flowObject);
        toast.loading("Saving workflow...", { id: "save-workflow" });
        saveMutation.mutate({ id: workflowId, definition: workflowDefinition });
      }}
    >
      Save
    </ThemedButton>
  );
}
