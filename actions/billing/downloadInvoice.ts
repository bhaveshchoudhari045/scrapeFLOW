"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function DownloadInvoice(id: string) {
  const { userId } = auth();
  if (!userId) {
    throw new Error("unauthenticated");
  }

  const purchase = await prisma.userPurchase.findUnique({
    where: {
      id,
      userId,
    },
  });

  if (!purchase) {
    throw new Error("bad request");
  }

  // Razorpay receipt URL (works in both test and live mode)
  return `https://dashboard.razorpay.com/app/payments/${purchase.razorpayId}`;
}