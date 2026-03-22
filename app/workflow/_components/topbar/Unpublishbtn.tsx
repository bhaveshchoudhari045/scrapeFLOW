"use client";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { DownloadIcon } from "lucide-react";
import { UnpublishWorkflow } from "@/actions/workflows/unpublishWorkflow";
import { toast } from "sonner";

export default function UnpublishBtn({ workflowId }: { workflowId: string }) {
  const mutation = useMutation({
    mutationFn: (id: string) => UnpublishWorkflow(id),
    onSuccess: () => {
      toast.success("Workflow unpublished", { id: workflowId });
    },
    onError: () => {
      toast.error("Something went wrong", { id: workflowId });
    },
  });

  return (
    <Button
      variant={"outline"}
      className="flex items-center gap-2"
      disabled={mutation.isPending}
      onClick={() => {
        toast.loading("Unpublishing workflow...", { id: workflowId });
        mutation.mutate(workflowId);
      }}
    >
      <DownloadIcon size={16} className="stroke-orange-400" />
      Unpublish
    </Button>
  );
}
