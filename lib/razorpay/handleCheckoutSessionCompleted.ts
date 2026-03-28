import { getCreditsPack, PackId } from "@/types/billing";

import "server-only";
import prisma from "../prisma";

export async function HandleCheckoutSessionCompleted(payment: any) {
  console.log("USER ID:", payment.notes?.userId);
  console.log("PACK ID:", payment.notes?.packId);
  const userId = payment.notes?.userId;
  const packId = payment.notes?.packId;

  if (!userId) throw new Error("missing user id");
  if (!packId) throw new Error("missing pack id");

  const purchasedPack = getCreditsPack(packId as PackId);
  if (!purchasedPack) throw new Error("purchased pack not found");

  await prisma.userBalance.upsert({
    where: { userId },
    create: {
      userId,
      credits: purchasedPack.credits,
    },
    update: {
      credits: {
        increment: purchasedPack.credits,
      },
    },
  });

  await prisma.userPurchase.create({
    data: {
      userId,
      razorpayId: payment.id,
      description: `${purchasedPack.name} - ${purchasedPack.credits} credits`,
      amount: String(payment.amount),
      currency: payment.currency,
    },
  });
}
