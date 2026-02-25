import {
  FlowToExecutionPlan,
  FlowToExecutionPlanValildationError,
} from "@/lib/workflow/executionPlan";
import { AppNode } from "@/types/appNode";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import useFlowValidation from "./useFlowValidation";
import { toast } from "sonner";

const useExecutionPlan = () => {
  const { toObject } = useReactFlow();

  const { setInvalidInputs, clearErrors } = useFlowValidation();
  const handleError = useCallback(
    (error: any) => {
      switch (error.type) {
        case FlowToExecutionPlanValildationError.No_Entry_point:
          toast.error("No entry point found in the workflow. ");
          break;
        case FlowToExecutionPlanValildationError.Invalid_Inputs:
          toast.error(
            "Some nodes have invalid or missing inputs. Please check and fix them.",
          );
          setInvalidInputs(error.invalidElements);
          break;
        default:
          toast.error("Something went wrong.");
          break;
      }
    },
    [setInvalidInputs],
  );

  const generateExecutionPlan = useCallback(() => {
    const { nodes, edges } = toObject();
    //
    console.log("nodes:", nodes);
    console.log("edges:", edges);

    //
    const { executionPlan, error } = FlowToExecutionPlan(
      nodes as AppNode[],
      edges,
    );
    //
    console.log("executionPlan:", executionPlan);
    console.log("error:", error);
    //

    if (error) {
      handleError(error);
      return null;
    }
    clearErrors();
    return executionPlan;
  }, [toObject, handleError, clearErrors]);
  return generateExecutionPlan;
};
export default useExecutionPlan;
