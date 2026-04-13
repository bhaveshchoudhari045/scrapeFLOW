import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCreditsPack, PackId } from "@/types/billing";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { packId, paymentId, orderId } = body;

    if (!packId || !paymentId || !orderId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Normalize casing — this was the root cause
    const purchasedPack = getCreditsPack(packId.toUpperCase() as PackId);
    if (!purchasedPack) {
      return NextResponse.json(
        { error: `Invalid pack: ${packId}` },
        { status: 400 },
      );
    }

    // Idempotency check
    const existingPurchase = await prisma.userPurchase.findFirst({
      where: { userId, razorpayId: paymentId },
    });

    if (existingPurchase) {
      return NextResponse.json({
        success: true,
        message: "Credits already added",
        credits: purchasedPack.credits,
      });
    }

    // Add credits
    await prisma.userBalance.upsert({
      where: { userId },
      create: { userId, credits: purchasedPack.credits },
      update: { credits: { increment: purchasedPack.credits } },
    });

    // Record transaction
    await prisma.userPurchase.create({
      data: {
        userId,
        razorpayId: paymentId,
        description: `${purchasedPack.name} - ${purchasedPack.credits} credits`,
        amount: String(purchasedPack.price),
        currency: "INR",
      },
    });

    const updatedBalance = await prisma.userBalance.findUnique({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      message: "Credits added successfully",
      credits: purchasedPack.credits,
      newBalance: updatedBalance?.credits || 0,
    });
  } catch (error: any) {
    console.error("Error completing purchase:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
