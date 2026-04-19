"use client";

import { UnpublishWorkflow } from "@/actions/workflows/unpublishWorkflow";
import { useMutation } from "@tanstack/react-query";
import { DownloadIcon } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { ThemedButton } from "./ThemedButton";

export default function UnpublishBtn({ workflowId }: { workflowId: string }) {
  const mutation = useMutation({
    mutationFn: async (id: string) => await UnpublishWorkflow(id),
    onSuccess: () => {
      toast.success("Workflow unpublished", { id: workflowId });
    },
    onError: () => {
      toast.error("Something went wrong", { id: workflowId });
    },
  });

  return (
    <ThemedButton
      variant="danger"
      loading={mutation.isPending}
      icon={<DownloadIcon size={14} />}
      onClick={() => {
        toast.loading("Unpublishing...", { id: workflowId });
        mutation.mutate(workflowId);
      }}
    >
      Unpublish
    </ThemedButton>
  );
}
