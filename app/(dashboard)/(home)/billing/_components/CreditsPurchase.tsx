"use client";

import { useState } from "react";
import { CreditCard, Zap, Star } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PurchaseCredits } from "@/actions/billing/purchaseCredits";

const PLANS = [
  {
    id: "SMALL",
    name: "Starter",
    credits: 1000,
    price: 99,
    priceFormatted: "₹99",
    perCredit: "₹0.099 / credit",
    badge: null,
    icon: Zap,
  },
  {
    id: "MEDIUM",
    name: "Growth",
    credits: 5000,
    price: 399,
    priceFormatted: "₹399",
    perCredit: "₹0.079 / credit",
    badge: "Most Popular",
    icon: Star,
  },
  {
    id: "LARGE",
    name: "Scale",
    credits: 10000,
    price: 699,
    priceFormatted: "₹699",
    perCredit: "₹0.069 / credit",
    badge: "Best Value",
    icon: CreditCard,
  },
];

// Declare Razorpay type for TypeScript
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CreditsPurchase() {
  const [selected, setSelected] = useState("MEDIUM");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const selectedPlan = PLANS.find((p) => p.id === selected)!;

  async function handlePurchase() {
    if (loading) return;
    setLoading(true);

    try {
      // Create Razorpay order
      const orderData = await PurchaseCredits(selected as any);

      // Check if Razorpay is loaded
      if (typeof window.Razorpay === "undefined") {
        toast.error("Payment system not loaded. Please refresh the page.");
        setLoading(false);
        return;
      }

      // Initialize Razorpay checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: "FlowScrape",
        description: `${selectedPlan.name} - ${selectedPlan.credits} credits`,
        image: "/logo.png", // Add your logo if available
        handler: async function (response: any) {
          console.log("Payment success:", response);
          setLoading(true);

          try {
            const result = await fetch("/api/billing/complete-purchase", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                packId: selected.toUpperCase(), // ← fix casing
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            const data = await result.json();
            console.log("API response:", data);

            if (data.success) {
              toast.success(
                `✓ ${selectedPlan.credits.toLocaleString()} credits added!`,
              );
              router.refresh();
            } else {
              toast.error(data.error || "Something went wrong");
            }
          } catch (error: any) {
            console.error("Error:", error);
            toast.error("Failed to add credits");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: "",
          email: "",
          contact: "",
        },
        theme: {
          color: "#10b981", // Emerald color matching your brand
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            toast.info("Payment cancelled");
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error("Purchase error:", error);
      toast.error(error.message || "Failed to initiate payment");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "1.5rem",
        marginBottom: "1.5rem",
      }}
    >
      <div className="section-header">
        <div className="section-header-icon">
          <CreditCard size={18} strokeWidth={1.75} />
        </div>
        <div>
          <div className="section-header-title">Purchase Credits</div>
          <div className="section-header-sub">
            Select the pack that fits your needs
          </div>
        </div>
      </div>

      <div className="credit-grid">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isSelected = selected === plan.id;
          return (
            <button
              key={plan.id}
              className={`credit-card${isSelected ? " selected" : ""}`}
              onClick={() => setSelected(plan.id)}
              type="button"
              disabled={loading}
            >
              {/* Badge or checkmark */}
              {plan.badge && !isSelected && (
                <span className="credit-card-badge">{plan.badge}</span>
              )}
              <span className="credit-card-check">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>

              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: isSelected ? "var(--accent-cur)" : "var(--bg2)",
                  border: `1px solid ${isSelected ? "transparent" : "var(--border)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "0.875rem",
                  color: isSelected ? "white" : "var(--tx3)",
                  transition: "all 0.2s",
                }}
              >
                <Icon size={18} strokeWidth={1.75} />
              </div>

              <div className="credit-card-name">{plan.name}</div>
              <div className="credit-card-price">{plan.priceFormatted}</div>
              <div className="credit-card-credits">
                {plan.credits.toLocaleString()} credits
              </div>
              <div className="credit-card-per">{plan.perCredit}</div>
            </button>
          );
        })}
      </div>

      <button
        className="purchase-btn"
        onClick={handlePurchase}
        disabled={loading}
        style={{
          opacity: loading ? 0.6 : 1,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? (
          <>
            <div
              className="spinner"
              style={{
                width: 18,
                height: 18,
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "white",
                borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
              }}
            />
            Processing...
          </>
        ) : (
          <>
            <CreditCard size={18} strokeWidth={1.75} />
            Purchase {selectedPlan.credits.toLocaleString()} Credits for{" "}
            {selectedPlan.priceFormatted}
          </>
        )}
      </button>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
