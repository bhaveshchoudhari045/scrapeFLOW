"use client";
import { RunWorkflow } from "@/actions/workflows/runWorkflow";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { PlayIcon } from "lucide-react";
import React from "react";
import { toast } from "sonner";

export default function RunBtn({ workflowId }: { workflowId: string }) {
  const mutation = useMutation({
    mutationFn: (data: { workflowId: string }) => RunWorkflow(data),
    onSuccess: () => {
      toast.success("Workflow started", { id: workflowId });
    },
    onError: () => {
      toast.error("something went wrong", { id: workflowId });
    },
  });
  return (
    <Button
      variant={"outline"}
      size={"sm"}
      className="flex items-center gap-2"
      disabled={mutation.isPending}
      onClick={() => {
        mutation.mutate({
          workflowId,
        });
      }}
    >
      <PlayIcon size={16} />
      Run
    </Button>
  );
}
