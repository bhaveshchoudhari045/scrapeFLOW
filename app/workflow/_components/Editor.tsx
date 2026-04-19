"use client";

import { Workflow } from "@prisma/client";
import React from "react";
import { ReactFlowProvider } from "@xyflow/react";
import FlowEditor from "./FlowEditor";
import Topbar from "@/app/workflow/_components/topbar/Topbar";
import TaskMenu from "./TaskMenu";
import { FlowValidationContextProvider } from "@/components/context/FlowValidationContext";
import { WorkflowStatus } from "@/types/workflow";
import { usePalette } from "@/components/hooks/usePalette";

function Editor({ workflow }: { workflow: Workflow }) {
  const { primary, rgb, isDark } = usePalette();

  return (
    <FlowValidationContextProvider>
      <ReactFlowProvider>
        <div
          className="flex flex-col h-full w-full overflow-hidden"
          style={{
            background: isDark ? "#0d0f14" : "#f0f2f8",
            // Subtle palette-tinted vignette on the overall shell
            boxShadow: `inset 0 0 120px rgba(${rgb}, ${isDark ? 0.04 : 0.03})`,
          }}
        >
          <Topbar
            title="Workflow editor"
            subtitle={workflow.name}
            workflowId={workflow.id}
            isPublished={workflow.status === WorkflowStatus.PUBLISHED}
          />
          <section className="flex h-full overflow-hidden">
            <TaskMenu />
            <FlowEditor workflow={workflow} />
          </section>
        </div>
      </ReactFlowProvider>
    </FlowValidationContextProvider>
  );
}

export default Editor;