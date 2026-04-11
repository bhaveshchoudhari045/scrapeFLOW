"use client";

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

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      {/* NAVIGATION */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Logo fontSize="text-xl" iconSize={18} />

          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How it Works
            </a>
            <a
              href="#pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-emerald-500/20 transition-all">
                  Get Started
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <button
                onClick={() => router.push("/workflows")}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
              >
                Dashboard
              </button>
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 mb-6">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              AI-Powered Web Intelligence
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
              Transform
            </span>
            <br />
            <span className="text-foreground">Any Website Into Data</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Extract structured data from any website using workflows. No code,
            no selectors, no hassle. Just ask and receive.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2 group">
                  Start Scraping Free
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <button
                onClick={() => router.push("/workflows")}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2 group"
              >
                Go to Dashboard
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </SignedIn>
            <a
              href="#features"
              className="px-6 py-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors font-medium"
            >
              See How It Works
            </a>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-3xl mx-auto">
            {[
              { label: "Pages Scraped", value: "50K+" },
              { label: "Uptime", value: "99.9%" },
              { label: "AI Models", value: "3" },
              { label: "Data Sources", value: "12+" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Extract Data
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Powerful features designed to make web scraping effortless
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: "Natural Language",
                description:
                  "Just describe what you want. Our AI translates your intent into precise extraction logic.",
                color: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-emerald-500/10",
              },
              {
                icon: Zap,
                title: "AIXPLORE Analysis",
                description:
                  "Transform raw data into insights with AI summaries, predictions, and visualizations.",
                color: "text-blue-600 dark:text-blue-400",
                bg: "bg-blue-500/10",
              },
              {
                icon: Workflow,
                title: "Visual Workflows",
                description:
                  "Build complex scraping pipelines with our drag-and-drop workflow editor.",
                color: "text-purple-600 dark:text-purple-400",
                bg: "bg-purple-500/10",
              },
              {
                icon: Download,
                title: "Export Anywhere",
                description:
                  "Download as JSON, CSV, or connect to webhooks and databases instantly.",
                color: "text-orange-600 dark:text-orange-400",
                bg: "bg-orange-500/10",
              },
              {
                icon: Lock,
                title: "Secure Credentials",
                description:
                  "Encrypted credential vault for authenticated scraping of paywalled content.",
                color: "text-red-600 dark:text-red-400",
                bg: "bg-red-500/10",
              },
              {
                icon: LineChart,
                title: "Real-time Analytics",
                description:
                  "Live dashboard showing execution stats, credit usage, and performance metrics.",
                color: "text-teal-600 dark:text-teal-400",
                bg: "bg-teal-500/10",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-all group"
              >
                <div
                  className={`w-12 h-12 rounded-lg ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg">
              From intent to insights in four simple steps
            </p>
          </div>

          <div className="space-y-12">
            {[
              {
                step: "01",
                title: "Describe Your Intent",
                description:
                  "Type in plain English what data you want. No URLs needed — our AI understands context.",
              },
              {
                step: "02",
                title: "AI Generates Selectors",
                description:
                  "Claude AI analyzes the target site and returns precise CSS selectors and extraction strategy.",
              },
              {
                step: "03",
                title: "Extract Data",
                description:
                  "Headless browser navigates the site and pulls structured records — presented instantly.",
              },
              {
                step: "04",
                title: "Analyze with AIXPLORE",
                description:
                  "Transform data into intelligence with AI summaries, predictions, and visualizations.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xl">
                  {item.step}
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground text-lg">
              Start free, scale as you grow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: "Free",
                price: "$0",
                period: "forever",
                features: [
                  "1,000 pages/month",
                  "Basic AI analysis",
                  "Export to JSON/CSV",
                  "Community support",
                ],
                cta: "Start Free",
                highlighted: false,
              },
              {
                name: "Pro",
                price: "$29",
                period: "per month",
                features: [
                  "50,000 pages/month",
                  "Advanced AIXPLORE",
                  "Visual workflows",
                  "Priority support",
                  "Webhook integrations",
                ],
                cta: "Get Started",
                highlighted: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "contact us",
                features: [
                  "Unlimited pages",
                  "Dedicated infrastructure",
                  "Custom integrations",
                  "SLA guarantee",
                  "24/7 support",
                ],
                cta: "Contact Sales",
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`p-8 rounded-xl border ${
                  plan.highlighted
                    ? "border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-500/10"
                    : "border-border bg-card"
                }`}
              >
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-2">
                    /{plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <ChevronRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
                <SignedOut>
                  <SignUpButton mode="modal">
                    <button
                      className={`w-full py-3 rounded-lg font-medium transition-all ${
                        plan.highlighted
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/20"
                          : "border border-border bg-card hover:bg-accent"
                      }`}
                    >
                      {plan.cta}
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <button
                    onClick={() => router.push("/workflows")}
                    className={`w-full py-3 rounded-lg font-medium transition-all ${
                      plan.highlighted
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/20"
                        : "border border-border bg-card hover:bg-accent"
                    }`}
                  >
                    {plan.cta}
                  </button>
                </SignedIn>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Web Data?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Join thousands extracting web intelligence in seconds. No credit
            card required.
          </p>
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="px-8 py-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium text-lg hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2 mx-auto group">
                Create Free Account
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <button
              onClick={() => router.push("/workflows")}
              className="px-8 py-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium text-lg hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2 mx-auto group"
            >
              Go to Dashboard
              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </SignedIn>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-1">
              <Logo fontSize="text-lg" iconSize={16} />
              <p className="text-sm text-muted-foreground mt-3">
                Intelligent web extraction powered by AI.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-sm">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#features"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    How it Works
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Pricing
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-sm">Use Cases</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <span className="text-muted-foreground">Finance Data</span>
                </li>
                <li>
                  <span className="text-muted-foreground">News Monitoring</span>
                </li>
                <li>
                  <span className="text-muted-foreground">Research</span>
                </li>
                <li>
                  <span className="text-muted-foreground">E-Commerce</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-sm">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <span className="text-muted-foreground">About</span>
                </li>
                <li>
                  <span className="text-muted-foreground">Privacy</span>
                </li>
                <li>
                  <span className="text-muted-foreground">Terms</span>
                </li>
                <li>
                  <span className="text-muted-foreground">Contact</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <span>© 2025 FlowScrape. All rights reserved.</span>
            <span>Built with Next.js and Claude AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
