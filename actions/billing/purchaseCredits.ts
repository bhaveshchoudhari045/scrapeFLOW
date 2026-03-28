"use server";

import { razorpay } from "@/lib/razorpay/razorpay";
import { getCreditsPack, PackId } from "@/types/billing";
import { auth } from "@clerk/nextjs/server";

export async function PurchaseCredits(packId: PackId) {
  const { userId } = auth();
  if (!userId) {
    throw new Error("unauthenticated");
  }

  const selectedPack = getCreditsPack(packId);
  if (!selectedPack) {
    throw new Error("invalid pack");
  }

  const order = await razorpay.orders.create({
    amount: selectedPack.price, // already in paise
    currency: "INR",

    notes: {
      userId,
      packId,
    },
    payment: {
      capture: "automatic",
      capture_options: {
        automatic_expiry_period: 12,
        manual_expiry_period: 7200,
        refund_speed: "optimum",
      },
    },
  });

  if (!order || !order.id) {
    throw new Error("cannot create razorpay order");
  }

  // Return order details to the client for checkout
  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID!,
  };
}
