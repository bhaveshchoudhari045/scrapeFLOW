"use client";
import { UpdateWorkflow } from "@/actions/workflows/updateWorkflow";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useReactFlow } from "@xyflow/react";
import { CheckIcon, Workflow } from "lucide-react";
import React from "react";
import { toast } from "sonner";

export default function SaveBtn({ workflowId }: { workflowId: string }) {
  const { toObject } = useReactFlow();

  const saveMutation = useMutation({
    mutationFn: async (data: { id: string; definition: string }) => {
      // Call the server action with plain data
      return await UpdateWorkflow(data);
    },
    onSuccess: () => {
      toast.success("Flow saved successfully", { id: "save-workflow" });
    },
    onError: (error) => {
      console.error("Save workflow error:", error);
      toast.error("Something went wrong", { id: "save-workflow" });
    },
  });

  return (
    <Button
      variant={"outline"}
      className="flex items-center gap-2"
      disabled={saveMutation.isPending}
      onClick={() => {
        const flowObject = toObject();
        const workflowDefinition = JSON.stringify(flowObject);
        toast.loading("Saving workflow...", { id: "save-workflow" });
        saveMutation.mutate({
          id: workflowId,
          definition: workflowDefinition,
        });
      }}
    >
      <CheckIcon size={16} className="stroke-green-400" />
      Save
    </Button>
  );
}
