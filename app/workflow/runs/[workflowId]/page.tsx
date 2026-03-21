import { GetWorkflowExecutions } from "@/actions/workflows/getWorkflowExecutions";
import Topbar from "../../_components/topbar/Topbar";
import { Suspense } from "react";
import { InboxIcon, Loader2Icon } from "lucide-react";
import { waitFor } from "@/lib/helper/waitFor";

export default function ExecutionsPage({
  params,
}: {
  params: { workflowId: string };
}) {
  return (
    <div className="h-full w-full overflow-auto">
      <Topbar
        workflowId={params.workflowId}
        hideButtons
        title="All runs"
        subtitle="List of all your workflow runs"
      />
      <Suspense
        fallback={
          <div className="flex w-full h-full items-center justify-center">
            <Loader2Icon size={30} className="animate-spin stroke-primary" />
          </div>
        }
      >
        <ExecutionTable workflowId={params.workflowId} />
      </Suspense>
    </div>
  );
}
async function ExecutionTable({ workflowId }: { workflowId: string }) {
  const executions = await GetWorkflowExecutions(workflowId);
  if (!executions) {
    return <div>No data</div>;
  }
  if (executions.length === 0) {
    return (
      <div className="container w-full py-6">
        <div className="flex items-center flex-col gap-2 justify-center h-full w-full">
          <div className="rounded-full bg-accent w-20 h-20 flex items-center justify-center">
            <InboxIcon size={40} className="stroke-primary" />
          </div>
          <div className="flex flex-col gap-1 text-center">
            <p className="font-bold">
              No runs have been triggered yet for this workflow
            </p>
            <p className="text-sm to-muted-foreground">
              You can trigger a new run in the editor page
            </p>
          </div>
        </div>
      </div>
    );
  }
  return <pre>{JSON.stringify(executions, null, 4)}</pre>;
}
