"use client";

import { RunWorkflow } from "@/actions/workflows/runWorkflow";
import { toast } from "sonner";
import useExecutionPlan from "@/components/hooks/useExecutionPlan";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { PlayIcon } from "lucide-react";
import React from "react";
import { useReactFlow } from "@xyflow/react";

function ExecuteBtn({ workflowId }: { workflowId: string }) {
  const generate = useExecutionPlan();
  const { toObject } = useReactFlow();

  const mutation = useMutation({
    mutationFn: async (data: { workflowId: string; flowDefinition?: string }) =>
      await RunWorkflow(data),
    onSuccess: () => {
      toast.success("Execution stated", { id: "flow-execution" });
    },
    onError: (error) => {
      console.log("error:", error);
      toast.error("Something went wrong", { id: "flow-execution" });
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
        const flowdef = JSON.parse(JSON.stringify(toObject()));
        mutation.mutate({
          workflowId,
          flowDefinition: JSON.stringify(flowdef),
        });
      }}
    >
      <PlayIcon size={16} className="stroke-orange-400" />
      Execute
    </Button>
  );
}

export default ExecuteBtn;
