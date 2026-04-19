import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const phaseId = searchParams.get("phaseId");

  if (!phaseId) {
    return new NextResponse("Missing phaseId", { status: 400 });
  }

  // FIX: ExecutionPhase doesn't have a direct relation to workflowExecution in include
  // so we fetch the phase first, then verify ownership via workflowExecutionId
  const phase = await prisma.executionPhase.findUnique({
    where: { id: phaseId },
  });

  if (!phase) {
    return new NextResponse("Phase not found", { status: 404 });
  }

  // Verify ownership by fetching the parent execution
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: phase.workflowExecutionId },
  });

  if (!execution || execution.userId !== userId) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!phase.outputs) {
    return new NextResponse("No outputs found", { status: 404 });
  }

  let csvData: {
    content: string;
    filename: string;
    mimeType: string;
  } | null = null;

  try {
    const outputs = JSON.parse(phase.outputs as string);
    const csvContent = outputs["CSV Content"];
    if (csvContent) {
      csvData = JSON.parse(csvContent);
    }
  } catch {
    return new NextResponse("Invalid output data", { status: 500 });
  }

  if (!csvData) {
    return new NextResponse("No CSV content found", { status: 404 });
  }

  return new NextResponse(csvData.content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvData.filename}"`,
    },
  });
}
