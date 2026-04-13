"use client";

import "@/app/(landing)/landing.css";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import Logo from "@/components/Logo";
import {
  ChevronRight,
  Zap,
  Brain,
  LineChart,
  Lock,
  Workflow,
  Download,
} from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    title: "Natural Language",
    desc: "Just describe what you want. Our AI translates your intent into precise extraction logic.",
    alt: false,
  },
  {
    icon: Zap,
    title: "AIXPLORE Analysis",
    desc: "Transform raw data into insights with AI summaries, predictions, and visualizations.",
    alt: true,
  },
  {
    icon: Workflow,
    title: "Visual Workflows",
    desc: "Build complex scraping pipelines with our drag-and-drop workflow editor.",
    alt: false,
  },
  {
    icon: Download,
    title: "Export Anywhere",
    desc: "Download as JSON, CSV, or connect to webhooks and databases instantly.",
    alt: true,
  },
  {
    icon: Lock,
    title: "Secure Credentials",
    desc: "Encrypted credential vault for authenticated scraping of paywalled content.",
    alt: false,
  },
  {
    icon: LineChart,
    title: "Real-time Analytics",
    desc: "Live dashboard showing execution stats, credit usage, and performance metrics.",
    alt: true,
  },
];

const STEPS = [
  {
    step: "01",
    title: "Describe Your Intent",
    desc: "Type in plain English what data you want. No URLs needed — our AI understands context.",
  },
  {
    step: "02",
    title: "AI Generates Selectors",
    desc: "Claude AI analyzes the target site and returns precise CSS selectors and extraction strategy.",
  },
  {
    step: "03",
    title: "Extract Data",
    desc: "Headless browser navigates the site and pulls structured records — presented instantly.",
  },
  {
    step: "04",
    title: "Analyze with AIXPLORE",
    desc: "Transform data into intelligence with AI summaries, predictions, and visualizations.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    featured: false,
    cta: "Start Free",
    features: [
      "1,000 pages/month",
      "Basic AI analysis",
      "Export to JSON/CSV",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: "$29",
    period: "per month",
    featured: true,
    cta: "Get Started",
    features: [
      "50,000 pages/month",
      "Advanced AIXPLORE",
      "Visual workflows",
      "Priority support",
      "Webhook integrations",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    featured: false,
    cta: "Contact Sales",
    features: [
      "Unlimited pages",
      "Dedicated infrastructure",
      "Custom integrations",
      "SLA guarantee",
      "24/7 support",
    ],
  },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="lp-root">
      {/* NAV */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <Logo fontSize="text-xl" iconSize={18} />
          <div className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it Works</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="lp-nav-actions">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="lp-btn-text">Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="lp-btn-primary">Get Started</button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <button
                className="lp-btn-primary"
                onClick={() => router.push("/workflows")}
              >
                Dashboard
              </button>
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-badge">
          <span className="lp-badge-dot" />
          <span>AI-Powered Web Intelligence</span>
        </div>

        <h1 className="lp-h1">
          <span className="lp-h1-accent">Transform</span>
          <br />
          Any Website Into Data
        </h1>

        <p className="lp-sub">
          Extract structured data from any website using visual workflows. No
          code, no selectors, no hassle. Just ask and receive.
        </p>

        <div className="lp-hero-actions">
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="lp-btn-primary-lg">
                Start Scraping Free <ChevronRight size={16} />
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <button
              className="lp-btn-primary-lg"
              onClick={() => router.push("/workflows")}
            >
              Go to Dashboard <ChevronRight size={16} />
            </button>
          </SignedIn>
          <a href="#features" className="lp-btn-ghost-lg">
            See How It Works
          </a>
        </div>

        <div className="lp-stats">
          {[
            { label: "Pages Scraped", value: "500K+" },
            { label: "Uptime", value: "99.9%" },
            { label: "AI Models", value: "3" },
            { label: "Data Sources", value: "12+" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div className="lp-stat-val">{s.value}</div>
              <div className="lp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="lp-section lp-section-alt">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <div className="lp-section-label">Features</div>
            <h2 className="lp-h2">Everything You Need to Extract Data</h2>
            <p className="lp-section-sub">
              Powerful tools designed to make web scraping effortless at any
              scale.
            </p>
          </div>
          <div className="lp-features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="lp-feature-card">
                <div className="lp-feature-icon">
                  <f.icon
                    size={20}
                    strokeWidth={1.75}
                    style={{
                      color: f.alt ? "var(--hi-cur)" : "var(--accent-cur)",
                    }}
                  />
                </div>
                <div className="lp-feature-title">{f.title}</div>
                <div className="lp-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="lp-section">
        <div className="lp-section-inner-sm">
          <div className="lp-section-head">
            <div className="lp-section-label">Process</div>
            <h2 className="lp-h2">How It Works</h2>
            <p className="lp-section-sub">
              From intent to insights in four simple steps.
            </p>
          </div>
          <div className="lp-steps">
            {STEPS.map((item) => (
              <div key={item.step} className="lp-step">
                <div className="lp-step-num">{item.step}</div>
                <div>
                  <div className="lp-step-title">{item.title}</div>
                  <div className="lp-step-desc">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="lp-section lp-section-alt">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <div className="lp-section-label">Pricing</div>
            <h2 className="lp-h2">Simple, Transparent Pricing</h2>
            <p className="lp-section-sub">Start free, scale as you grow.</p>
          </div>
          <div className="lp-pricing-grid">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`lp-price-card${plan.featured ? " featured" : ""}`}
              >
                <div className="lp-price-name">{plan.name}</div>
                <div style={{ marginBottom: "1.25rem" }}>
                  <span className="lp-price-val">{plan.price}</span>
                  <span className="lp-price-period">/ {plan.period}</span>
                </div>
                <ul className="lp-price-features">
                  {plan.features.map((f) => (
                    <li key={f}>
                      <span className="lp-check">
                        <ChevronRight size={10} strokeWidth={2.5} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <SignedOut>
                  <SignUpButton mode="modal">
                    <button
                      className={
                        plan.featured ? "lp-btn-primary-lg" : "lp-btn-ghost-lg"
                      }
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      {plan.cta}
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <button
                    className={
                      plan.featured ? "lp-btn-primary-lg" : "lp-btn-ghost-lg"
                    }
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => router.push("/workflows")}
                  >
                    {plan.cta}
                  </button>
                </SignedIn>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta flex justify-center">
        <div className="lp-cta-inner flex flex-col justify-center text-center">
          <h2 className="lp-h2">Ready to Transform Web Data?</h2>
          <p
            className="lp-section-sub  flex justify-center"
            style={{ marginBottom: "2rem" }}
          >
            Join thousands extracting web intelligence in seconds. No credit
            card required.
          </p>
          <SignedOut>
            <SignUpButton mode="modal">
              <button
                className="lp-btn-primary-lg"
                style={{ margin: "0 auto" }}
              >
                Create Free Account <ChevronRight size={16} />
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <button
              className="lp-btn-primary-lg"
              style={{ margin: "0 auto" }}
              onClick={() => router.push("/workflows")}
            >
              Go to Dashboard <ChevronRight size={16} />
            </button>
          </SignedIn>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <Logo fontSize="text-lg" iconSize={16} />
              <p>Intelligent web extraction powered by AI.</p>
            </div>
            <div className="lp-footer-col">
              <h5>Product</h5>
              <a href="#features">Features</a>
              <a href="#how-it-works">How it Works</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="lp-footer-col">
              <h5>Use Cases</h5>
              <span>Finance Data</span>
              <span>News Monitoring</span>
              <span>Research</span>
              <span>E-Commerce</span>
            </div>
            <div className="lp-footer-col">
              <h5>Company</h5>
              <span>About</span>
              <span>Privacy</span>
              <span>Terms</span>
              <span>Contact</span>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>© 2025 FlowScrape. All rights reserved.</span>
            <span>Built with Next.js and Claude AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
