"use client";
import "@/app/(landing)/landing.css";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";

// ─── Default articles data ────────────────────────────────────────────────────
const DEFAULT_ARTICLES = [
  {
    id: 1,
    title: "How Flow Scrape Uses Claude AI to Generate CSS Selectors",
    excerpt:
      "A deep dive into the natural language pipeline that converts user intent into precise extraction logic.",
    author: "Flow Scrape Team",
    date: "2025-03-15",
    tag: "Tutorial",
    icon: "🧠",
    grad: "linear-gradient(135deg,#0d1a2a,#1a3a5c)",
  },
  {
    id: 2,
    title: "AIXPLORE: Turning Raw Scraped Data into Business Intelligence",
    excerpt:
      "From Hacker News headlines to financial trend predictions — how our AI analysis layer works under the hood.",
    author: "Flow Scrape Team",
    date: "2025-03-20",
    tag: "Case Study",
    icon: "✦",
    grad: "linear-gradient(135deg,#1a0d2a,#3a1a5c)",
  },
  {
    id: 3,
    title: "Building Reliable Scrapers: Handling Bot Protection Gracefully",
    excerpt:
      "Why we chose a fallback-first architecture and how graceful degradation makes demos bulletproof.",
    author: "Flow Scrape Team",
    date: "2025-03-25",
    tag: "Research",
    icon: "🛡️",
    grad: "linear-gradient(135deg,#0d2a1a,#1a5c3a)",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);

  // ─── Canvas + cursor + scroll + count-up effects ──────────────────────────
  useEffect(() => {
    // ── Canvas background ──────────────────────────────────────────────────
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0,
      H = 0,
      frame = 0;
    let animId: number;

    function resizeCanvas() {
      W = canvas!.width = window.innerWidth;
      H = canvas!.height = window.innerHeight;
    }

    class Particle {
      x = 0;
      y = 0;
      vx = 0;
      vy = 0;
      r = 0;
      life = 0;
      maxLife = 0;
      color = "";
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.r = Math.random() * 1.2 + 0.3;
        this.life = 0;
        this.maxLife = 200 + Math.random() * 300;
        this.color = Math.random() > 0.7 ? "#9b6dff" : "#00f5ff";
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life++;
        if (
          this.x < 0 ||
          this.x > W ||
          this.y < 0 ||
          this.y > H ||
          this.life > this.maxLife
        )
          this.reset();
      }
      draw() {
        const a =
          this.life < 30
            ? this.life / 30
            : this.life > this.maxLife - 30
              ? (this.maxLife - this.life) / 30
              : 0.5;
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx!.fillStyle = this.color;
        ctx!.globalAlpha = a * 0.6;
        ctx!.fill();
      }
    }

    class Orb {
      x: number;
      y: number;
      r: number;
      col: string;
      ox: number;
      oy: number;
      t: number;
      speed: number;
      amp: number;
      constructor(x: number, y: number, r: number, col: string) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.col = col;
        this.ox = x;
        this.oy = y;
        this.t = Math.random() * Math.PI * 2;
        this.speed = 0.003 + Math.random() * 0.003;
        this.amp = 60 + Math.random() * 40;
      }
      update() {
        this.t += this.speed;
        this.x = this.ox + Math.sin(this.t) * this.amp;
        this.y = this.oy + Math.cos(this.t * 0.7) * this.amp * 0.6;
      }
      draw() {
        const g = ctx!.createRadialGradient(
          this.x,
          this.y,
          0,
          this.x,
          this.y,
          this.r,
        );
        g.addColorStop(0, this.col.replace(")", ",0.08)"));
        g.addColorStop(1, "transparent");
        ctx!.globalAlpha = 1;
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx!.fillStyle = g;
        ctx!.fill();
      }
    }

    let particles: Particle[] = [];
    const orbs: Orb[] = [];

    function initParticles() {
      particles = [];
      for (let i = 0; i < 80; i++) particles.push(new Particle());
    }

    function initOrbs() {
      orbs.length = 0;
      orbs.push(new Orb(W * 0.2, H * 0.3, 400, "rgba(0,245,255"));
      orbs.push(new Orb(W * 0.8, H * 0.6, 350, "rgba(155,109,255"));
      orbs.push(new Orb(W * 0.5, H * 0.8, 300, "rgba(0,200,212"));
    }

    function drawGrid() {
      ctx!.globalAlpha = 0.03;
      ctx!.strokeStyle = "#00f5ff";
      const spacing = 80;
      for (let x = 0; x < W; x += spacing) {
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, H);
        ctx!.stroke();
      }
      for (let y = 0; y < H; y += spacing) {
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(W, y);
        ctx!.stroke();
      }
      ctx!.globalAlpha = 1;
    }

    function animate() {
      ctx!.clearRect(0, 0, W, H);
      frame++;
      drawGrid();
      orbs.forEach((o) => {
        o.update();
        o.draw();
      });
      ctx!.globalAlpha = 1;
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      ctx!.globalAlpha = 1;
      animId = requestAnimationFrame(animate);
    }

    resizeCanvas();
    initParticles();
    initOrbs();
    animate();

    const onResize = () => {
      resizeCanvas();
      initParticles();
      initOrbs();
    };
    window.addEventListener("resize", onResize);

    // ── Custom cursor ──────────────────────────────────────────────────────
    const cur = cursorRef.current;
    const ring = cursorRingRef.current;
    let mx = 0,
      my = 0,
      rx = 0,
      ry = 0;
    let ringAnimId: number;

    const onMouseMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (cur) {
        cur.style.left = mx + "px";
        cur.style.top = my + "px";
      }
    };
    document.addEventListener("mousemove", onMouseMove);

    function loopRing() {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      if (ring) {
        ring.style.left = rx + "px";
        ring.style.top = ry + "px";
      }
      ringAnimId = requestAnimationFrame(loopRing);
    }
    loopRing();

    const interactables = document.querySelectorAll("a,button");
    interactables.forEach((el) => {
      el.addEventListener("mouseenter", () => {
        if (ring) {
          ring.style.transform = "translate(-50%,-50%) scale(1.8)";
          ring.style.borderColor = "rgba(0,245,255,0.8)";
        }
      });
      el.addEventListener("mouseleave", () => {
        if (ring) {
          ring.style.transform = "translate(-50%,-50%) scale(1)";
          ring.style.borderColor = "rgba(0,245,255,0.5)";
        }
      });
    });

    // ── Nav scroll ────────────────────────────────────────────────────────
    const navbar = document.getElementById("navbar");
    const onScroll = () => {
      if (navbar) navbar.classList.toggle("scrolled", window.scrollY > 60);
    };
    window.addEventListener("scroll", onScroll);

    // ── Scroll reveal ─────────────────────────────────────────────────────
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));

    // ── Count-up ──────────────────────────────────────────────────────────
    const countObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          const target = parseInt(el.dataset.count || "0");
          const suffix = target >= 1000 ? "K+" : target >= 100 ? "%" : "+";
          const display = target >= 1000 ? target / 1000 : target;
          let current = 0;
          const step = display / 60;
          const timer = setInterval(() => {
            current = Math.min(current + step, display);
            el.textContent =
              (Number.isInteger(display)
                ? Math.floor(current)
                : current.toFixed(0)) + suffix;
            if (current >= display) clearInterval(timer);
          }, 16);
          countObs.unobserve(el);
        });
      },
      { threshold: 0.5 },
    );
    document
      .querySelectorAll("[data-count]")
      .forEach((el) => countObs.observe(el));

    // ── Articles ──────────────────────────────────────────────────────────
    const savedArticles = localStorage.getItem("fs-articles");
    const articles = savedArticles
      ? JSON.parse(savedArticles)
      : DEFAULT_ARTICLES;
    const grid = document.getElementById("articles-grid");
    if (grid) {
      grid.innerHTML = articles
        .slice(0, 6)
        .map(
          (a: (typeof DEFAULT_ARTICLES)[0]) => `
        <div class="article-card reveal">
          <div class="article-img">
            <div class="article-img-bg" style="background:${a.grad || "linear-gradient(135deg,#0d0d1f,#1a1a3a)"}"></div>
            <div class="article-img-icon">${a.icon || "📄"}</div>
          </div>
          <div class="article-body">
            <div class="article-tag">${a.tag || "Article"}</div>
            <div class="article-title">${a.title}</div>
            <div class="article-meta">
              <span>${a.author || "Team"}</span>
              <span>${a.date || ""}</span>
            </div>
          </div>
        </div>
      `,
        )
        .join("");
      grid
        .querySelectorAll(".article-card.reveal")
        .forEach((el) => obs.observe(el));
    }

    return () => {
      cancelAnimationFrame(animId);
      cancelAnimationFrame(ringAnimId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mousemove", onMouseMove);
      obs.disconnect();
      countObs.disconnect();
    };
  }, []);

  // ─── Nav mobile toggle ────────────────────────────────────────────────────
  const toggleNav = () => {
    document.getElementById("nav-links")?.classList.toggle("open");
  };

  return (
    <div className="landing-root">
      {/* <div
        style={{
          position: "relative",
          height: "100vh",
          background: "var(--black)",
        }}
      ></div> */}
      {/* ── Styles ── */}
      {/* <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --black:#04040a;
          --surface:#080812;
          --surface2:#0d0d1f;
          --cyan:#00f5ff;
          --cyan2:#00c8d4;
          --gold:#f0c060;
          --violet:#9b6dff;
          --white:#f0eff8;
          --dim:rgba(240,239,248,0.45);
          --faint:rgba(240,239,248,0.18);
          --border:rgba(255,255,255,0.07);
          --border2:rgba(0,245,255,0.15);
          --font-display:'Bebas Neue',sans-serif;
          --font-serif:'Instrument Serif',serif;
          --font-body:'DM Sans',sans-serif;
          --gutter:clamp(1.25rem,5vw,4rem);
        }
        html{scroll-behavior:smooth;overflow-x:hidden}
        body{
          background:var(--black);color:var(--white);
          font-family:var(--font-body);font-weight:300;
          line-height:1.7;overflow-x:hidden;cursor:none;
        }
        #cursor{
          position:fixed;width:10px;height:10px;
          background:var(--cyan);border-radius:50%;
          pointer-events:none;z-index:9999;
          transform:translate(-50%,-50%);
          transition:transform 0.1s,background 0.2s;
          mix-blend-mode:difference;
        }
        #cursor-ring{
          position:fixed;width:36px;height:36px;
          border:1px solid rgba(0,245,255,0.5);
          border-radius:50%;pointer-events:none;z-index:9998;
          transform:translate(-50%,-50%);
          transition:all 0.18s cubic-bezier(0.16,1,0.3,1);
        }
        #bg-canvas{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0.7;}
        body::after{
          content:'';position:fixed;inset:0;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events:none;z-index:1;opacity:0.4;
        }
        nav{
          position:fixed;top:0;left:0;right:0;z-index:100;
          padding:1.25rem var(--gutter);
          display:flex;align-items:center;justify-content:space-between;
          border-bottom:1px solid transparent;transition:all 0.4s;
        }
        nav.scrolled{background:rgba(4,4,10,0.85);backdrop-filter:blur(20px);border-bottom-color:var(--border);}
        .nav-logo{
          font-family:var(--font-display);font-size:1.6rem;letter-spacing:0.06em;
          color:var(--cyan);text-decoration:none;display:flex;align-items:center;gap:0.5rem;
        }
        .nav-logo-dot{
          width:8px;height:8px;border-radius:50%;background:var(--cyan);
          box-shadow:0 0 12px var(--cyan);animation:pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.7)}}
        .nav-links{display:flex;align-items:center;gap:2rem}
        .nav-links a{
          color:var(--dim);font-size:0.8rem;text-decoration:none;
          letter-spacing:0.08em;text-transform:uppercase;
          transition:color 0.2s;position:relative;
        }
        .nav-links a::after{
          content:'';position:absolute;bottom:-4px;left:0;right:0;
          height:1px;background:var(--cyan);
          transform:scaleX(0);transition:transform 0.3s;transform-origin:left;
        }
        .nav-links a:hover{color:var(--white)}
        .nav-links a:hover::after{transform:scaleX(1)}
        .nav-cta{
          padding:0.5rem 1.25rem;border:1px solid var(--border2);border-radius:100px;
          color:var(--cyan)!important;font-size:0.78rem;text-decoration:none;
          letter-spacing:0.08em;text-transform:uppercase;
          transition:all 0.25s;background:rgba(0,245,255,0.05);cursor:pointer;border:1px solid var(--border2);
        }
        .nav-cta:hover{background:rgba(0,245,255,0.12)!important;box-shadow:0 0 24px rgba(0,245,255,0.2)}
        .nav-hamburger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:4px;background:none;border:none;}
        .nav-hamburger span{display:block;width:24px;height:1.5px;background:var(--dim);transition:all 0.3s}
        .hero{
          position:relative;z-index:2;min-height:100vh;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          text-align:center;padding:8rem var(--gutter) 4rem;overflow:hidden;
        }
        .hero-eyebrow{
          display:inline-flex;align-items:center;gap:0.5rem;
          font-size:0.68rem;letter-spacing:0.2em;text-transform:uppercase;
          color:var(--cyan);border:1px solid var(--border2);
          padding:0.35rem 0.875rem;border-radius:100px;margin-bottom:2rem;
          animation:fadein 1s 0.2s both;
        }
        .hero-eyebrow-dot{width:5px;height:5px;border-radius:50%;background:var(--cyan);animation:pulse-dot 1.5s infinite}
        .hero-title{
          font-family:var(--font-display);font-size:clamp(4rem,12vw,11rem);
          line-height:0.9;letter-spacing:0.02em;text-transform:uppercase;
          animation:fadein 1s 0.4s both;position:relative;
        }
        .hero-title-line1{display:block;color:var(--white)}
        .hero-title-line2{
          display:block;
          background:linear-gradient(90deg,var(--cyan),var(--violet),var(--gold),var(--cyan));
          background-size:300% 100%;
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          animation:grad-shift 4s linear infinite;
        }
        @keyframes grad-shift{0%{background-position:0% 50%}100%{background-position:300% 50%}}
        .hero-sub{
          max-width:520px;font-size:clamp(0.9rem,2vw,1.05rem);color:var(--dim);
          line-height:1.75;margin:1.75rem auto 2.5rem;
          animation:fadein 1s 0.6s both;font-family:var(--font-serif);font-style:italic;
        }
        .hero-actions{
          display:flex;align-items:center;gap:1rem;flex-wrap:wrap;justify-content:center;
          animation:fadein 1s 0.8s both;
        }
        .btn-primary{
          padding:0.875rem 2rem;border-radius:100px;background:var(--cyan);color:var(--black);
          font-size:0.82rem;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;
          text-decoration:none;border:none;cursor:pointer;
          transition:all 0.25s;position:relative;overflow:hidden;font-family:var(--font-body);
        }
        .btn-primary::before{
          content:'';position:absolute;inset:0;
          background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.3) 50%,transparent 70%);
          background-size:200% 100%;transform:translateX(-100%);transition:transform 0.5s;
        }
        .btn-primary:hover::before{transform:translateX(100%)}
        .btn-primary:hover{box-shadow:0 0 40px rgba(0,245,255,0.4);transform:translateY(-2px)}
        .btn-ghost{
          padding:0.875rem 2rem;border-radius:100px;border:1px solid var(--border);
          color:var(--dim);font-size:0.82rem;letter-spacing:0.08em;text-transform:uppercase;
          text-decoration:none;background:transparent;cursor:pointer;
          transition:all 0.25s;font-family:var(--font-body);
        }
        .btn-ghost:hover{border-color:var(--border2);color:var(--white);background:rgba(0,245,255,0.05)}
        .hero-scroll{
          position:absolute;bottom:2.5rem;left:50%;transform:translateX(-50%);
          display:flex;flex-direction:column;align-items:center;gap:0.5rem;
          font-size:0.62rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--faint);
          animation:fadein 1s 1.2s both;
        }
        .hero-scroll-line{
          width:1px;height:48px;background:linear-gradient(to bottom,var(--cyan),transparent);
          animation:scroll-line 2s ease-in-out infinite;
        }
        @keyframes scroll-line{0%,100%{opacity:1;transform:scaleY(1)}50%{opacity:0.3;transform:scaleY(0.5)}}
        section{position:relative;z-index:2;padding:6rem var(--gutter)}
        .section-label{
          font-size:0.62rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--cyan);
          margin-bottom:0.875rem;display:flex;align-items:center;gap:0.625rem;
        }
        .section-label::before{content:'';display:block;width:24px;height:1px;background:var(--cyan)}
        .section-title{
          font-family:var(--font-display);font-size:clamp(2.5rem,6vw,5rem);
          line-height:1;letter-spacing:0.02em;text-transform:uppercase;margin-bottom:1.25rem;
        }
        .section-body{
          font-family:var(--font-serif);font-style:italic;
          font-size:clamp(1rem,2vw,1.15rem);color:var(--dim);line-height:1.8;max-width:520px;
        }
        .marquee-wrap{
          position:relative;z-index:2;border-top:1px solid var(--border);border-bottom:1px solid var(--border);
          padding:1.25rem 0;overflow:hidden;background:rgba(0,245,255,0.02);
        }
        .marquee-track{display:flex;gap:3rem;width:max-content;animation:marquee 22s linear infinite;}
        .marquee-track:hover{animation-play-state:paused}
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .marquee-item{
          display:flex;align-items:center;gap:0.75rem;font-family:var(--font-display);
          font-size:1.2rem;letter-spacing:0.08em;color:var(--faint);white-space:nowrap;text-transform:uppercase;
        }
        .marquee-sep{color:var(--cyan);font-size:0.8rem}
        .mv-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;max-width:1100px;margin:3rem auto 0;}
        .mv-card{
          border:1px solid var(--border);border-radius:20px;padding:2.5rem;
          position:relative;overflow:hidden;background:rgba(255,255,255,0.02);
          transition:border-color 0.3s,transform 0.3s;
        }
        .mv-card::before{
          content:'';position:absolute;top:0;left:0;right:0;height:1px;
          background:linear-gradient(90deg,transparent,var(--cyan),transparent);opacity:0;transition:opacity 0.3s;
        }
        .mv-card:hover{border-color:var(--border2);transform:translateY(-4px)}
        .mv-card:hover::before{opacity:1}
        .mv-number{
          font-family:var(--font-display);font-size:5rem;color:rgba(0,245,255,0.06);line-height:1;
          position:absolute;top:1.5rem;right:1.75rem;letter-spacing:-0.04em;
        }
        .mv-icon{
          font-size:1.5rem;margin-bottom:1.25rem;width:44px;height:44px;border-radius:10px;
          background:rgba(0,245,255,0.08);border:1px solid var(--border2);
          display:flex;align-items:center;justify-content:center;
        }
        .mv-card h3{
          font-family:var(--font-display);font-size:1.8rem;letter-spacing:0.04em;text-transform:uppercase;
          margin-bottom:0.875rem;color:var(--white);
        }
        .mv-card p{font-size:0.875rem;color:var(--dim);line-height:1.75}
        .stats-row{
          display:grid;grid-template-columns:repeat(4,1fr);gap:1px;
          background:var(--border);border:1px solid var(--border);border-radius:16px;
          overflow:hidden;max-width:900px;margin:0 auto;
        }
        .stat-cell{background:var(--surface);padding:2rem;text-align:center;transition:background 0.2s;}
        .stat-cell:hover{background:var(--surface2)}
        .stat-num{
          font-family:var(--font-display);font-size:clamp(2.5rem,5vw,4rem);
          line-height:1;color:var(--cyan);letter-spacing:-0.02em;
        }
        .stat-label{font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--faint);margin-top:0.5rem;}
        .features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem;max-width:1100px;margin:3rem auto 0;}
        .feature-card{
          border:1px solid var(--border);border-radius:16px;padding:2rem;
          background:rgba(255,255,255,0.015);transition:all 0.3s;position:relative;overflow:hidden;cursor:default;
        }
        .feature-card::after{
          content:'';position:absolute;bottom:-60px;right:-60px;width:120px;height:120px;border-radius:50%;
          background:radial-gradient(circle,var(--glow-color,rgba(0,245,255,0.08)),transparent 70%);transition:opacity 0.3s;
        }
        .feature-card:hover{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.03);transform:translateY(-3px)}
        .feature-icon{
          font-size:1.25rem;width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;
          margin-bottom:1.25rem;border:1px solid var(--border);background:rgba(255,255,255,0.03);
        }
        .feature-card h4{
          font-family:var(--font-display);font-size:1.3rem;letter-spacing:0.04em;text-transform:uppercase;
          margin-bottom:0.625rem;color:var(--white);
        }
        .feature-card p{font-size:0.8rem;color:var(--dim);line-height:1.7}
        .feature-tag{
          display:inline-block;margin-top:1rem;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;
          padding:0.2rem 0.6rem;border-radius:100px;
          background:rgba(0,245,255,0.08);color:var(--cyan);border:1px solid var(--border2);
        }
        .how-wrap{max-width:900px;margin:3rem auto 0}
        .how-step{
          display:grid;grid-template-columns:80px 1fr;gap:2rem;padding:2rem 0;
          border-bottom:1px solid var(--border);position:relative;
        }
        .how-step:last-child{border-bottom:none}
        .how-num{font-family:var(--font-display);font-size:4rem;color:rgba(0,245,255,0.12);line-height:1;letter-spacing:-0.04em;padding-top:0.25rem;}
        .how-content h4{
          font-family:var(--font-display);font-size:1.4rem;letter-spacing:0.04em;text-transform:uppercase;
          color:var(--white);margin-bottom:0.5rem;
        }
        .how-content p{font-size:0.85rem;color:var(--dim);line-height:1.7}
        .articles-header{
          display:flex;align-items:flex-end;justify-content:space-between;
          max-width:1100px;margin:0 auto 2rem;flex-wrap:wrap;gap:1rem;
        }
        .articles-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem;max-width:1100px;margin:0 auto;}
        .article-card{
          border:1px solid var(--border);border-radius:16px;overflow:hidden;
          background:rgba(255,255,255,0.015);transition:all 0.3s;cursor:pointer;
          display:flex;flex-direction:column;
        }
        .article-card:hover{border-color:rgba(255,255,255,0.12);transform:translateY(-4px);box-shadow:0 20px 60px rgba(0,0,0,0.4)}
        .article-img{
          height:180px;background:linear-gradient(135deg,var(--surface2),var(--surface));
          position:relative;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;
        }
        .article-img-bg{position:absolute;inset:0;}
        .article-img-icon{font-size:2.5rem;position:relative;z-index:1}
        .article-body{padding:1.25rem;flex:1;display:flex;flex-direction:column}
        .article-tag{font-size:0.6rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--cyan);margin-bottom:0.625rem;}
        .article-title{font-family:var(--font-serif);font-size:1rem;line-height:1.45;color:var(--white);margin-bottom:0.5rem;flex:1;}
        .article-meta{font-size:0.68rem;color:var(--faint);display:flex;justify-content:space-between;margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border);}
        footer{position:relative;z-index:2;border-top:1px solid var(--border);padding:3rem var(--gutter) 2rem;}
        .footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:3rem;max-width:1100px;margin:0 auto 3rem;}
        .footer-brand .nav-logo{font-size:1.4rem;margin-bottom:0.875rem;display:inline-flex}
        .footer-brand p{font-size:0.8rem;color:var(--faint);line-height:1.7;max-width:220px}
        .footer-col h5{font-size:0.62rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--dim);margin-bottom:1rem;}
        .footer-col a{display:block;font-size:0.78rem;color:var(--faint);text-decoration:none;margin-bottom:0.5rem;transition:color 0.2s;cursor:pointer;}
        .footer-col a:hover{color:var(--cyan)}
        .footer-bottom{
          display:flex;align-items:center;justify-content:space-between;
          max-width:1100px;margin:0 auto;padding-top:2rem;border-top:1px solid var(--border);
          font-size:0.68rem;color:var(--faint);flex-wrap:wrap;gap:0.5rem;
        }
        .footer-bottom a{color:var(--faint);text-decoration:none;transition:color 0.2s}
        .footer-bottom a:hover{color:var(--cyan)}
        .reveal{opacity:0;transform:translateY(32px);transition:opacity 0.7s cubic-bezier(0.16,1,0.3,1),transform 0.7s cubic-bezier(0.16,1,0.3,1)}
        .reveal.visible{opacity:1;transform:none}
        .reveal-delay-1{transition-delay:0.1s}
        .reveal-delay-2{transition-delay:0.2s}
        .reveal-delay-3{transition-delay:0.3s}
        .reveal-delay-4{transition-delay:0.4s}
        @keyframes fadein{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @media(max-width:900px){
          .mv-grid{grid-template-columns:1fr}
          .features-grid{grid-template-columns:1fr 1fr}
          .articles-grid{grid-template-columns:1fr 1fr}
          .stats-row{grid-template-columns:repeat(2,1fr)}
          .footer-grid{grid-template-columns:1fr 1fr;gap:2rem}
        }
        @media(max-width:640px){
          .nav-links{display:none}
          .nav-links.open{
            display:flex;flex-direction:column;position:fixed;top:64px;left:0;right:0;
            background:rgba(4,4,10,0.97);backdrop-filter:blur(20px);
            padding:2rem;gap:1.5rem;border-bottom:1px solid var(--border);z-index:99;
          }
          .nav-hamburger{display:flex}
          .features-grid{grid-template-columns:1fr}
          .articles-grid{grid-template-columns:1fr}
          .stats-row{grid-template-columns:repeat(2,1fr)}
          .how-step{grid-template-columns:50px 1fr;gap:1rem}
          .how-num{font-size:2.5rem}
          .footer-grid{grid-template-columns:1fr;gap:2rem}
          .footer-bottom{flex-direction:column;align-items:center;text-align:center}
        }
      `}</style> */}

      {/* Google Fonts */}
      {/* <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap"
        rel="stylesheet"
      /> */}

      {/* ── Custom cursor ── */}
      <div id="cursor" ref={cursorRef} />
      <div id="cursor-ring" ref={cursorRingRef} />

      {/* ── Canvas sits behind everything ── */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.7,
          width: "100%",
          height: "100%",
        }}
      />

      {/* ── All page content sits above canvas ── */}
      <div style={{ position: "relative", zIndex: 2 }}>
        {/* ── NAV ── */}
        <nav id="navbar">
          <a href="#" className="nav-logo">
            <div className="nav-logo-dot" />
            Flow Scrape
          </a>
          <div className="nav-links" id="nav-links">
            <a href="#mission">Mission</a>
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#articles">Articles</a>

            {/* Clerk-powered Sign In in nav */}
            <SignedOut>
              <SignInButton mode="modal">
                <button className="nav-cta">Sign In</button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <button
                className="nav-cta"
                onClick={() => router.push("/workflows")}
              >
                Dashboard →
              </button>
            </SignedIn>
          </div>
          <button className="nav-hamburger" id="hamburger" onClick={toggleNav}>
            <span />
            <span />
            <span />
          </button>
        </nav>

        {/* ── HERO ── */}
        <section className="hero" id="home">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-dot" />
            Intelligent Web Intelligence
          </div>
          <h1 className="hero-title">
            <span className="hero-title-line1">Flow</span>
            <span className="hero-title-line2">Scrape</span>
          </h1>
          <p className="hero-sub">
            Transform any website into structured intelligence. Powered by AI.
            Built for the future of data.
          </p>
          <div className="hero-actions">
            {/* Clerk-powered CTA buttons */}
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="btn-primary">Start Scraping Free</button>
              </SignUpButton>
              <a href="#features" className="btn-ghost">
                See How It Works
              </a>
            </SignedOut>
            <SignedIn>
              <button
                className="btn-primary"
                onClick={() => router.push("/workflows")}
              >
                Go to Dashboard →
              </button>
              <a href="#features" className="btn-ghost">
                See How It Works
              </a>
            </SignedIn>
          </div>
          <div className="hero-scroll">
            <span>Scroll</span>
            <div className="hero-scroll-line" />
          </div>
        </section>

        {/* ── MARQUEE ── */}
        <div className="marquee-wrap">
          <div className="marquee-track" id="marquee-track">
            {[
              "Natural Language Scraping",
              "AI-Powered Analysis",
              "Real-Time Data",
              "Automated Workflows",
              "One-Click Export",
              "AIXPLORE Intelligence",
              "Natural Language Scraping",
              "AI-Powered Analysis",
              "Real-Time Data",
              "Automated Workflows",
              "One-Click Export",
              "AIXPLORE Intelligence",
            ].map((item, i) => (
              <div className="marquee-item" key={i}>
                {item} <span className="marquee-sep">✦</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── STATS ── */}
        <section style={{ padding: "4rem var(--gutter)" }}>
          <div className="stats-row reveal">
            <div className="stat-cell">
              <div className="stat-num" data-count="50000">
                0
              </div>
              <div className="stat-label">Pages Scraped</div>
            </div>
            <div className="stat-cell">
              <div className="stat-num" data-count="99">
                0
              </div>
              <div className="stat-label">Uptime %</div>
            </div>
            <div className="stat-cell">
              <div className="stat-num" data-count="3">
                0
              </div>
              <div className="stat-label">AI Models</div>
            </div>
            <div className="stat-cell">
              <div className="stat-num" data-count="12">
                0
              </div>
              <div className="stat-label">Task Types</div>
            </div>
          </div>
        </section>

        {/* ── MISSION / VISION ── */}
        <section id="mission">
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div className="section-label reveal">About</div>
            <h2 className="section-title reveal reveal-delay-1">
              Our Mission & Vision
            </h2>
            <p className="section-body reveal reveal-delay-2">
              We believe data should be accessible to everyone. Flow Scrape
              democratises web intelligence — turning any website into
              structured, actionable data without writing a single line of code.
            </p>
            <div className="mv-grid" style={{ marginTop: "3rem" }}>
              {[
                {
                  num: "01",
                  icon: "🎯",
                  title: "Mission",
                  body: "To make web data extraction as natural as asking a question — eliminating technical barriers so anyone can extract, analyse, and act on web intelligence instantly.",
                  delay: "reveal-delay-1",
                },
                {
                  num: "02",
                  icon: "🔭",
                  title: "Vision",
                  body: "A world where data flows freely — where businesses, researchers, and individuals can query the entire web as effortlessly as they search Google, powered by AI that understands intent.",
                  delay: "reveal-delay-2",
                },
                {
                  num: "03",
                  icon: "⚡",
                  title: "Values",
                  body: "Speed without compromise. Privacy by design. Transparency in AI. We build tools we'd use ourselves — honest, powerful, and obsessively reliable.",
                  delay: "reveal-delay-3",
                },
                {
                  num: "04",
                  icon: "🌐",
                  title: "Approach",
                  body: "Natural language first. No selectors. No code. Describe what you want, and our AI figures out how to get it — with graceful fallbacks for every edge case.",
                  delay: "reveal-delay-4",
                },
              ].map((card) => (
                <div className={`mv-card reveal ${card.delay}`} key={card.num}>
                  <div className="mv-number">{card.num}</div>
                  <div className="mv-icon">{card.icon}</div>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" style={{ background: "rgba(255,255,255,0.01)" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div className="section-label reveal">Features</div>
            <h2 className="section-title reveal reveal-delay-1">
              Built Different
            </h2>
            <p className="section-body reveal reveal-delay-2">
              Every feature designed to remove friction between you and the data
              you need.
            </p>
            <div className="features-grid" style={{ marginTop: "3rem" }}>
              {[
                {
                  icon: "🧠",
                  title: "Natural Language",
                  desc: "Just describe what you want. Our AI translates your intent into precise CSS selectors and structured extraction logic automatically.",
                  tag: "AI Core",
                  glow: "rgba(0,245,255,0.08)",
                  delay: "reveal-delay-1",
                },
                {
                  icon: "✦",
                  title: "AIXPLORE",
                  desc: "One button transforms raw data into insights — AI summaries, trend predictions, sentiment analysis, and rich visualizations.",
                  tag: "Premium",
                  glow: "rgba(155,109,255,0.08)",
                  delay: "reveal-delay-2",
                },
                {
                  icon: "⚙️",
                  title: "Workflow Builder",
                  desc: "Visual node-based editor to build complex multi-step scraping pipelines. Schedule, automate, and chain tasks with zero code.",
                  tag: "Pro",
                  glow: "rgba(240,192,96,0.08)",
                  delay: "reveal-delay-3",
                },
                {
                  icon: "📊",
                  title: "Export Anywhere",
                  desc: "Download as JSON, CSV, or ZIP of images. Connect to webhooks, databases, or any downstream system instantly.",
                  tag: "All Plans",
                  glow: "rgba(0,245,255,0.08)",
                  delay: "reveal-delay-1",
                },
                {
                  icon: "🔐",
                  title: "Secure Credentials",
                  desc: "Encrypted credential vault for authenticated scraping. Access paywalled content securely without exposing your passwords.",
                  tag: "Enterprise",
                  glow: "rgba(155,109,255,0.08)",
                  delay: "reveal-delay-2",
                },
                {
                  icon: "📡",
                  title: "Real-Time Analytics",
                  desc: "Live dashboard showing execution stats, credit usage, workflow performance, and historical trends at a glance.",
                  tag: "Pro",
                  glow: "rgba(240,192,96,0.08)",
                  delay: "reveal-delay-3",
                },
              ].map((f) => (
                <div
                  className={`feature-card reveal ${f.delay}`}
                  key={f.title}
                  style={{ "--glow-color": f.glow } as React.CSSProperties}
                >
                  <div className="feature-icon">{f.icon}</div>
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                  <span className="feature-tag">{f.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how">
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div className="section-label reveal">Process</div>
            <h2 className="section-title reveal reveal-delay-1">
              How It Works
            </h2>
            <div className="how-wrap">
              {[
                {
                  num: "01",
                  title: "Describe Your Intent",
                  body: "Type in plain English what data you want and from where. No URLs needed — our AI understands context like 'get me the latest tech news' or 'show stock prices for Apple.'",
                },
                {
                  num: "02",
                  title: "AI Generates Selectors",
                  body: "Claude AI analyses the target site and returns precise CSS selectors, data keys, and extraction strategy — optimised for reliability with hardcoded fallbacks for top sites.",
                },
                {
                  num: "03",
                  title: "Puppeteer Extracts Data",
                  body: "Headless browser navigates the site, waits for dynamic content, and pulls structured records — presented instantly in RAW, Structured, or Table view.",
                },
                {
                  num: "04",
                  title: "AIXPLORE Analyses It",
                  body: "Hit AIXPLORE to trigger AI analysis — summaries read aloud, per-site predictions, expandable insights, and Recharts visualizations. Data becomes intelligence.",
                },
              ].map((step) => (
                <div className="how-step reveal" key={step.num}>
                  <div className="how-num">{step.num}</div>
                  <div className="how-content">
                    <h4>{step.title}</h4>
                    <p>{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ARTICLES ── */}
        <section id="articles" style={{ background: "rgba(255,255,255,0.01)" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div className="articles-header reveal">
              <div>
                <div
                  className="section-label"
                  style={{ marginBottom: "0.5rem" }}
                >
                  Knowledge
                </div>
                <h2 className="section-title" style={{ marginBottom: 0 }}>
                  Articles & Updates
                </h2>
              </div>
              <a
                href="#"
                className="btn-ghost"
                style={{
                  fontSize: "0.75rem",
                  padding: "0.625rem 1.25rem",
                  whiteSpace: "nowrap",
                }}
              >
                View all →
              </a>
            </div>
            {/* Articles are injected by useEffect via JS */}
            <div className="articles-grid" id="articles-grid" />
          </div>
        </section>

        {/* ── CTA BAND ── */}
        <section style={{ textAlign: "center", padding: "6rem var(--gutter)" }}>
          <div className="reveal">
            <div className="section-label" style={{ justifyContent: "center" }}>
              Get Started
            </div>
            <h2 className="section-title" style={{ marginBottom: "1.25rem" }}>
              Ready to Scrape?
            </h2>
            <p
              style={{
                color: "var(--dim)",
                maxWidth: "420px",
                margin: "0 auto 2.5rem",
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: "1rem",
                lineHeight: 1.75,
              }}
            >
              Join thousands extracting web intelligence in seconds. No credit
              card required.
            </p>
            <SignedOut>
              <SignUpButton mode="modal">
                <button
                  className="btn-primary"
                  style={{ fontSize: "0.875rem", padding: "1rem 2.5rem" }}
                >
                  Create Free Account
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <button
                className="btn-primary"
                style={{ fontSize: "0.875rem", padding: "1rem 2.5rem" }}
                onClick={() => router.push("/workflows")}
              >
                Go to Dashboard →
              </button>
            </SignedIn>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer>
          <div className="footer-grid">
            <div className="footer-brand">
              <a href="#" className="nav-logo">
                <div className="nav-logo-dot" />
                Flow Scrape
              </a>
              <p>
                Intelligent web extraction powered by AI. Turn any website into
                structured data instantly.
              </p>
            </div>
            <div className="footer-col">
              <h5>Product</h5>
              <a href="#features">Features</a>
              <a href="#how">How it Works</a>
              <a href="#articles">Articles</a>
              <SignedOut>
                <SignInButton mode="modal">
                  <a>Sign In</a>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <a onClick={() => router.push("/workflows")}>Dashboard</a>
              </SignedIn>
            </div>
            <div className="footer-col">
              <h5>Use Cases</h5>
              <a href="#">Finance Data</a>
              <a href="#">News Monitoring</a>
              <a href="#">Research</a>
              <a href="#">E-Commerce</a>
            </div>
            <div className="footer-col">
              <h5>Company</h5>
              <a href="#mission">Mission</a>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Contact</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2025 Flow Scrape. All rights reserved.</span>
            <span>Built with ✦ and Claude AI</span>
            <a href="mailto:hello@flowscrape.dev">hello@flowscrape.dev</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
