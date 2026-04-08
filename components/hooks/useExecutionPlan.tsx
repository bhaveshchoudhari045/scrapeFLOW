"use client";
import {
  FlowToExecutionPlan,
  FlowToExecutionPlanValidationError,
} from "@/lib/workflow/executionPlan";
import { AppNode } from "@/types/appNode";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { toast } from "sonner";

const useExecutionPlan = () => {
  const { toObject } = useReactFlow();

  const generateExecutionPlan = useCallback(() => {
    const { nodes, edges } = toObject();
    const { executionPlan, error } = FlowToExecutionPlan(
      nodes as AppNode[],
      edges,
    );

    if (error) {
      switch (error.type) {
        case FlowToExecutionPlanValidationError.NO_ENTRY_POINT:
          toast.error("No entry point found", {
            description: "Add a Launch Browser node to start your workflow.",
            id: "execution-plan-error",
          });
          break;
        case FlowToExecutionPlanValidationError.INVALID_INPUTS:
          toast.error("Invalid workflow inputs", {
            description:
              "Some nodes have required inputs that are not connected or filled in.",
            id: "execution-plan-error",
          });
          break;
        default:
          toast.error("Invalid workflow", { id: "execution-plan-error" });
      }
      return undefined;
    }

    return executionPlan;
  }, [toObject]);

  return generateExecutionPlan;
};

export default useExecutionPlan;
