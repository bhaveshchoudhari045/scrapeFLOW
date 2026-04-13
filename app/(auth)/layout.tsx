import React from "react";
import Logo from "@/components/Logo";
import "./auth.css";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-root">
      {/* Left — decorative brand panel */}
      <div className="auth-left">
        <div className="auth-left-content">
          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-mark">FS</div>
            <span className="auth-logo-text">FlowScrape</span>
          </div>
        </div>

        {/* Tagline */}
        <div className="auth-tagline">
          <h2>
            Automate the
            <br />
            <span>web intelligently</span>
          </h2>
          <p>
            Build powerful scraping workflows, run them on a schedule, and
            analyse the data — all in one place.
          </p>

          <div className="auth-features">
            <div className="auth-feature">
              <span className="auth-feature-dot" />
              Visual workflow builder with 50+ node types
            </div>
            <div className="auth-feature">
              <span className="auth-feature-dot" />
              AI-powered data extraction and analysis
            </div>
            <div className="auth-feature">
              <span className="auth-feature-dot" />
              Scheduled runs with real-time monitoring
            </div>
            <div className="auth-feature">
              <span className="auth-feature-dot" />
              Encrypted credential management
            </div>
          </div>
        </div>

        {/* Decorative grid lines */}
        <div className="auth-grid-lines" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="auth-grid-line"
              style={{ top: `${i * 20}%` }}
            />
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-clerk-wrap">{children}</div>
        </div>

        <p className="auth-footer-text">
          By continuing, you agree to our <a href="#">Terms of Service</a> and{" "}
          <a href="#">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
