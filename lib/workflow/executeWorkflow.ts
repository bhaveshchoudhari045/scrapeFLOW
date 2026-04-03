import "server-only";
import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import {
  ExecutionPhaseStatus,
  WorkflowExecutionStatus,
} from "@/types/workflow";
import { ExecutionPhase } from "@prisma/client";
import { AppNode } from "@/types/appNode";
import { TaskRegistry } from "./task/registry";
import { ExecutorRegistry } from "./executor/registry";
import { Environment, ExecutionEnvironment } from "@/types/executor";
import { TaskParamType } from "@/types/task";
import { Browser, Page } from "puppeteer";
import { Edge } from "@xyflow/react";
import { LogCollector } from "@/types/log";
import { createLogCollector } from "../log";

// ── Loop state type for array/repeat/until loops ──
interface LoopState {
  loopEndNodeId: string;
  bodyNodeIds: string[];
  sourceArray: any[];
  currentIndex: number;
  accumulatedResults: any[];
  loopType: "array" | "repeat" | "until";
}

export async function ExecuteWorkflow(executionId: string, nextRunAt?: Date) {
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
    include: {
      workflow: true,
      phases: {
        orderBy: { number: "asc" },
      },
    },
  });
  if (!execution) {
    throw new Error("Execution not found");
  }

  const edges = JSON.parse(execution.definition).edges as Edge[];
  const environment: Environment = { phases: {} };

  await initalizeWorkflowExecution(
    executionId,
    execution.workflowId,
    nextRunAt,
  );
  await initializePhaseStatuses(execution);

  let creditConsumed = 0;

  // ── Replaced simple for-loop with runExecutionLoop for loop/branch support ──
  const executionFailed = await runExecutionLoop(
    execution,
    environment,
    edges,
    execution.userId,
    (credits: number) => {
      creditConsumed += credits;
    },
  );

  await finalizeWorkflowExecution(
    executionId,
    execution.workflowId,
    executionFailed,
    creditConsumed,
  );
  await cleanupEnvironment(environment);
  revalidatePath("/workflow/runs");
}

// ── Main execution loop with loop and branching support ──
async function runExecutionLoop(
  executionData: any,
  environment: Environment,
  edges: Edge[],
  userId: string,
  onCreditsConsumed: (credits: number) => void,
): Promise<boolean> {
  const activeLoops = new Map<string, LoopState>();
  let phaseIndex = 0;
  let executionFailed = false;

  while (phaseIndex < executionData.phases.length) {
    const phase = executionData.phases[phaseIndex];
    const node = JSON.parse(phase.node) as AppNode;

    // ── Skip phase if upstream branch excluded it ──
    if (shouldSkipPhaseForBranching(node, edges, environment)) {
      environment.phases[node.id] = {
        inputs: {},
        outputs: { __SKIPPED__: "true" },
      };
      await prisma.executionPhase.update({
        where: { id: phase.id },
        data: { status: "SKIPPED", completedAt: new Date() },
      });
      phaseIndex++;
      continue;
    }

    // ── LOOP_START handling ──
    const isLoopStart = [
      "LOOP_START_ARRAY",
      "LOOP_START_REPEAT",
      "LOOP_START_UNTIL_CONDITION",
    ].includes(node.data.type);

    if (isLoopStart) {
      const loopResult = await executeWorkflowPhase(
        phase,
        environment,
        edges,
        userId,
      );
      onCreditsConsumed(loopResult.creditsConsumed);
      if (!loopResult.success) {
        executionFailed = true;
        break;
      }

      const outputs = environment.phases[node.id]?.outputs || {};

      if (node.data.type === "LOOP_START_ARRAY") {
        const sourceArray = JSON.parse(outputs["__SOURCE_ARRAY__"] || "[]");

        if (sourceArray.length === 0) {
          // Empty array — jump past the matching LOOP_END
          const loopEndNodeId = outputs["__LOOP_END_ID__"];
          const loopEndIdx = executionData.phases.findIndex(
            (p: any) => JSON.parse(p.node).id === loopEndNodeId,
          );
          phaseIndex = loopEndIdx !== -1 ? loopEndIdx + 1 : phaseIndex + 1;
          continue;
        }

        const bodyNodeIds = JSON.parse(outputs["__BODY_NODE_IDS__"] || "[]");
        const loopEndNodeId = outputs["__LOOP_END_ID__"] || "";

        activeLoops.set(node.id, {
          loopEndNodeId,
          bodyNodeIds,
          sourceArray,
          currentIndex: 0,
          accumulatedResults: [],
          loopType: "array",
        });

        // Inject first iteration item
        environment.phases[node.id].outputs["Data"] = JSON.stringify(
          sourceArray[0],
        );
        environment.phases[node.id].outputs["Current Index"] = "0";
      }

      phaseIndex++;
      continue;
    }

    // ── LOOP_END handling ──
    if (node.data.type === "LOOP_END") {
      let parentLoop: LoopState | undefined;
      let parentLoopId: string | undefined;

      for (const [loopId, loopState] of activeLoops) {
        if (loopState.loopEndNodeId === node.id) {
          parentLoop = loopState;
          parentLoopId = loopId;
          break;
        }
      }

      if (parentLoop && parentLoopId) {
        const preserveInputs: Record<string, string> = {
          __LOOP_ACCUMULATED__: JSON.stringify(parentLoop.accumulatedResults),
          __LOOP_SUCCESS_COUNT__: String(parentLoop.accumulatedResults.length),
        };

        const continueSignal = parentLoop.bodyNodeIds.some(
          (id) =>
            environment.phases[id]?.outputs["__FLOW_CONTINUE__"] === "true",
        );
        if (continueSignal) preserveInputs["__FLOW_CONTINUE__"] = "true";

        const phaseResult = await executeWorkflowPhase(
          phase,
          environment,
          edges,
          userId,
          preserveInputs,
        );
        onCreditsConsumed(phaseResult.creditsConsumed);
        if (!phaseResult.success) {
          executionFailed = true;
          break;
        }

        const accJson =
          environment.phases[node.id]?.outputs["__LOOP_ACCUMULATED__"];
        if (accJson) parentLoop.accumulatedResults = JSON.parse(accJson);

        const breakSignal = parentLoop.bodyNodeIds.some(
          (id) => environment.phases[id]?.outputs["__FLOW_BREAK__"] === "true",
        );
        const returnSignal = parentLoop.bodyNodeIds.some(
          (id) => environment.phases[id]?.outputs["__FLOW_RETURN__"] === "true",
        );

        if (breakSignal || returnSignal) {
          environment.phases[node.id].outputs["Data"] = JSON.stringify(
            parentLoop.accumulatedResults,
            null,
            2,
          );
          activeLoops.delete(parentLoopId);
          phaseIndex++;
          continue;
        }

        if (parentLoop.currentIndex < parentLoop.sourceArray.length - 1) {
          // Advance to next iteration
          parentLoop.currentIndex++;
          environment.phases[parentLoopId] = {
            inputs: {},
            outputs: {
              Data: JSON.stringify(
                parentLoop.sourceArray[parentLoop.currentIndex],
              ),
              "Current Index": String(parentLoop.currentIndex),
              __SOURCE_ARRAY__: JSON.stringify(parentLoop.sourceArray),
              __LOOP_END_ID__: parentLoop.loopEndNodeId,
              __BODY_NODE_IDS__: JSON.stringify(parentLoop.bodyNodeIds),
            },
          };

          // Reset body node outputs for the next iteration
          for (const bodyId of parentLoop.bodyNodeIds) {
            if (bodyId !== node.id) {
              environment.phases[bodyId] = { inputs: {}, outputs: {} };
            }
          }

          const loopStartIdx = executionData.phases.findIndex(
            (p: any) => JSON.parse(p.node).id === parentLoopId,
          );
          phaseIndex = loopStartIdx !== -1 ? loopStartIdx + 1 : phaseIndex + 1;
          continue;
        } else {
          // Loop exhausted — emit accumulated results and clean up
          environment.phases[node.id].outputs["Data"] = JSON.stringify(
            parentLoop.accumulatedResults,
            null,
            2,
          );
          activeLoops.delete(parentLoopId);
        }
      }

      phaseIndex++;
      continue;
    }

    // ── Normal phase execution ──
    const result = await executeWorkflowPhase(
      phase,
      environment,
      edges,
      userId,
    );
    onCreditsConsumed(result.creditsConsumed);
    if (!result.success) {
      executionFailed = true;
      break;
    }

    // ── FLOW_STOP: halt entire workflow ──
    if (environment.phases[node.id]?.outputs["__FLOW_STOP__"] === "true") {
      executionFailed = true;
      break;
    }

    // ── FLOW_BREAK: exit innermost active loop ──
    if (environment.phases[node.id]?.outputs["__FLOW_BREAK__"] === "true") {
      for (const [loopId, loopState] of activeLoops) {
        if (loopState.bodyNodeIds.includes(node.id)) {
          const loopEndIdx = executionData.phases.findIndex(
            (p: any) => JSON.parse(p.node).id === loopState.loopEndNodeId,
          );
          if (loopEndIdx !== -1) {
            environment.phases[loopState.loopEndNodeId] = {
              inputs: {},
              outputs: {
                Data: JSON.stringify(loopState.accumulatedResults, null, 2),
              },
            };
            activeLoops.delete(loopId);
            phaseIndex = loopEndIdx + 1;
          }
          break;
        }
      }
      continue;
    }

    // ── FLOW_CONTINUE: jump to LOOP_END of innermost loop ──
    let jumped = false;
    if (environment.phases[node.id]?.outputs["__FLOW_CONTINUE__"] === "true") {
      for (const [, loopState] of activeLoops) {
        if (loopState.bodyNodeIds.includes(node.id)) {
          const loopEndIdx = executionData.phases.findIndex(
            (p: any) => JSON.parse(p.node).id === loopState.loopEndNodeId,
          );
          if (loopEndIdx !== -1) {
            phaseIndex = loopEndIdx;
            jumped = true;
          }
          break;
        }
      }
    }

    if (!jumped) phaseIndex++;
  }

  return executionFailed;
}

// ── Returns true if this node should be skipped due to upstream branch logic ──
function shouldSkipPhaseForBranching(
  node: AppNode,
  edges: Edge[],
  environment: Environment,
): boolean {
  const incoming = edges.filter((e) => e.target === node.id);
  if (!incoming.length) return false;

  return incoming.every((edge) => {
    const srcOutputs = environment.phases[edge.source]?.outputs;
    if (!srcOutputs) return false;
    if (srcOutputs["__SKIPPED__"] === "true") return true;
    const handle = edge.sourceHandle;
    if (handle === "True" && srcOutputs["__BRANCH_TRUE__"] === "skipped")
      return true;
    if (handle === "False" && srcOutputs["__BRANCH_FALSE__"] === "skipped")
      return true;
    return false;
  });
}

async function initalizeWorkflowExecution(
  executionId: string,
  workflowId: string,
  nextRunAt?: Date,
) {
  await prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      startedAt: new Date(),
      status: WorkflowExecutionStatus.RUNNING,
    },
  });
  await prisma.workflow.update({
    where: { id: workflowId },
    data: {
      lastRunAt: new Date(),
      lastRunStatus: WorkflowExecutionStatus.RUNNING,
      lastRunId: executionId,
      ...(nextRunAt && { nextRunAt }),
    },
  });
}

async function initializePhaseStatuses(execution: any) {
  await prisma.executionPhase.updateMany({
    where: {
      id: {
        in: execution.phases.map((phase: any) => phase.id),
      },
    },
    data: {
      status: ExecutionPhaseStatus.PENDING,
    },
  });
}

async function finalizeWorkflowExecution(
  executionId: string,
  workflowId: string,
  executionFailed: boolean,
  creditsConsumed: number,
) {
  const finalStatus = executionFailed
    ? WorkflowExecutionStatus.FAILED
    : WorkflowExecutionStatus.COMPLETED;

  await prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      creditsConsumed,
    },
  });

  await prisma.workflow
    .update({
      where: { id: workflowId, lastRunId: executionId },
      data: { lastRunStatus: finalStatus },
    })
    .catch(() => {
      // Ignore — a newer run has already updated lastRunId
    });
}

// ── Updated signature: accepts optional preserveInputs for loop boundary phases ──
async function executeWorkflowPhase(
  phase: ExecutionPhase,
  environment: Environment,
  edges: Edge[],
  userId: string,
  preserveInputs?: Record<string, string>,
) {
  const logCollector = createLogCollector();
  const startedAt = new Date();
  const node = JSON.parse(phase.node) as AppNode;

  setupEnvironmentForPhase(node, environment, edges);

  // Merge any loop-injected inputs (e.g. __LOOP_ACCUMULATED__) on top of resolved inputs
  if (preserveInputs) {
    Object.assign(environment.phases[node.id].inputs, preserveInputs);
  }

  await prisma.executionPhase.update({
    where: { id: phase.id },
    data: {
      status: ExecutionPhaseStatus.RUNNING,
      startedAt,
      inputs: JSON.stringify(environment.phases[node.id].inputs),
    },
  });

  const creditsRequired = TaskRegistry[node.data.type].credits;
  let success = await decrementCredits(userId, creditsRequired, logCollector);
  const creditsConsumed = success ? creditsRequired : 0;

  if (success) {
    success = await executePhase(phase, node, environment, logCollector);
  }

  const outputs = environment.phases[node.id].outputs;
  await finalizePhase(
    phase.id,
    success,
    outputs,
    logCollector,
    creditsConsumed,
  );
  return { success, creditsConsumed };
}

async function finalizePhase(
  phaseId: string,
  success: boolean,
  outputs: any,
  logCollector: LogCollector,
  creditsConsumed: number,
) {
  const finalStatus = success
    ? ExecutionPhaseStatus.COMPLETED
    : ExecutionPhaseStatus.FAILED;

  await prisma.executionPhase.update({
    where: { id: phaseId },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      outputs: JSON.stringify(outputs),
      creditsConsumed,
      logs: {
        createMany: {
          data: logCollector.getAll().map((log) => ({
            message: log.message,
            timestamp: log.timestamp,
            logLevel: log.level,
          })),
        },
      },
    },
  });
}

async function executePhase(
  phase: ExecutionPhase,
  node: AppNode,
  environment: Environment,
  logCollector: LogCollector,
): Promise<boolean> {
  const runFn = ExecutorRegistry[node.data.type];

  if (!runFn) {
    logCollector.error(`not found executor for ${node.data.type}`);
    return false;
  }

  const executionEnvironment: ExecutionEnvironment<any> =
    createExecutionEnvironment(node, environment, logCollector);
  return await runFn(executionEnvironment);
}

function setupEnvironmentForPhase(
  node: AppNode,
  environment: Environment,
  edges: Edge[],
) {
  environment.phases[node.id] = { inputs: {}, outputs: {} };
  const inputs = TaskRegistry[node.data.type].inputs;

  for (const input of inputs) {
    if (input.type === TaskParamType.BROWSER_INSTANCE) continue;

    const inputValue = node.data.inputs[input.name];
    if (inputValue) {
      environment.phases[node.id].inputs[input.name] = inputValue;
      continue;
    }

    const connectedEdge = edges.find(
      (edge) => edge.target === node.id && edge.targetHandle === input.name,
    );

    if (!connectedEdge) {
      console.error(
        "Missing edge for input",
        input.name,
        " node id: ",
        node.id,
      );
      continue;
    }

    const outputValue =
      environment.phases[connectedEdge.source].outputs[
        connectedEdge.sourceHandle!
      ];
    environment.phases[node.id].inputs[input.name] = outputValue;
  }
}

function createExecutionEnvironment(
  node: AppNode,
  environment: Environment,
  logCollector: LogCollector,
): ExecutionEnvironment<any> {
  return {
    getInput: (name: string) => environment.phases[node.id]?.inputs[name],
    setOutput: (name: string, value: string) => {
      environment.phases[node.id].outputs[name] = value;
    },
    getBrowser: () => environment.browser,
    setBrowser: (browser: Browser) => (environment.browser = browser),
    getPage: () => environment.page,
    setPage: (page: Page) => (environment.page = page),
    log: logCollector,
  };
}

// ── Closes the Puppeteer browser if one was opened during execution ──
async function cleanupEnvironment(environment: Environment) {
  if (environment.browser) {
    await environment.browser
      .close()
      .catch((err) => console.error("Cannot close browser, reason: ", err));
  }
}

async function decrementCredits(
  userId: string,
  amount: number,
  logCollector: LogCollector,
) {
  try {
    await prisma.userBalance.update({
      where: { userId, credits: { gte: amount } },
      data: { credits: { decrement: amount } },
    });
    return true;
  } catch (error) {
    logCollector.error("insufficient balance");
    return false;
  }
}
