import { razorpay } from "@/lib/razorpay/razorpay";
import { HandleCheckoutSessionCompleted } from "@/lib/razorpay/handleCheckoutSessionCompleted";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get("x-razorpay-signature") as string;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;

  try {
    // Verify Razorpay webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return new NextResponse("invalid signature", { status: 400 });
    }

    const event = JSON.parse(body);

    console.log("🔥 EVENT:", event.event);
    console.log("💰 PAYMENT:", event.payload.payment.entity);
    switch (event.event) {
      case "payment.captured":
        await HandleCheckoutSessionCompleted(event.payload.payment.entity);
        break;
      default:
        break;
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("razorpay webhook error", error);
    return new NextResponse("webhook error", { status: 400 });
  }
}
