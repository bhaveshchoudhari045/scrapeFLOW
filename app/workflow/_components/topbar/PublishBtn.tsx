"use client";

import { RunWorkflow } from "@/actions/workflows/runWorkflow";
import { toast } from "sonner";
import useExecutionPlan from "@/components/hooks/useExecutionPlan";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { PlayIcon, UploadIcon } from "lucide-react";
import React from "react";
import { useReactFlow } from "@xyflow/react";
import { PublishWorkflow } from "@/actions/workflows/publishWorkflow";

export default function PublishBtn({ workflowId }: { workflowId: string }) {
  const generate = useExecutionPlan();
  const { toObject } = useReactFlow();

  const mutation = useMutation({
    mutationFn: async (data: { id: string; flowDefinition: string }) =>
      await PublishWorkflow(data),
    onSuccess: () => {
      toast.success("Workflow published", { id: workflowId });
    },
    onError: (error) => {
      console.log("error:", error);
      toast.error("Something went wrong", { id: workflowId });
    },
  });
  return (
    <Button
      variant={"outline"}
      className="flex items-center gap-2"
      disabled={mutation.isPending}
      onClick={() => {
        const plan = generate();
        if (!plan) {
          //client side validation...!
          return;
        }
        toast.loading("Publishing workflow....", {id:workflowId})
        const flowdef = JSON.parse(JSON.stringify(toObject()));
        mutation.mutate({
          id: workflowId,
          flowDefinition: JSON.stringify(flowdef),
        });
      }}
    >
      <UploadIcon size={16} className="stroke-green-400" />
      Publish
    </Button>
  );
}
