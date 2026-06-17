import type { Metadata } from "next";
import Link from "next/link";
import { AuthRedirect } from "@/components/shared/AuthRedirect";
import { LandingAnimations } from "@/components/shared/LandingAnimations";

export const metadata: Metadata = {
  title: "Brand — Where Brands Meet Creators. Simply.",
  description:
    "Post a collaboration. Get matched with the right creators. Chat. Ship. The simplest B2B2C collaboration marketplace for brands and influencers.",
  openGraph: {
    title: "Brand — Where Brands Meet Creators",
    description:
      "Post a collaboration. Get matched. Chat. Ship. The simplest marketplace for brand-creator partnerships.",
    type: "website",
    siteName: "Brand",
  },
  twitter: {
    card: "summary_large_image",
    title: "Brand — Where Brands Meet Creators",
    description:
      "Post a collaboration. Get matched. Chat. Ship.",
  },
};

const STEPS = [
  {
    number: "01",
    title: "Brand posts a Card",
    description:
      "Define your campaign in 30 seconds — set your niche, platform, budget, and deliverables. We handle the rest.",
    icon: "📋",
  },
  {
    number: "02",
    title: "Matched creators apply",
    description:
      "Creators matched to your niche get notified instantly. They pitch in 2 steps — no long forms, no friction.",
    icon: "🎯",
  },
  {
    number: "03",
    title: "Chat room opens",
    description:
      "Accept an application and a private realtime chat room opens. Discuss deliverables, share files, ship.",
    icon: "💬",
  },
];

const BRAND_BENEFITS = [
  "Post campaigns in under 3 minutes",
  "Smart matching finds the right creators",
  "Built-in chat — no back-and-forth emails",
  "Track applications and manage from one dashboard",
  "Verified creators with portfolio proof",
];

const CREATOR_BENEFITS = [
  "Discover collaborations matched to your niche",
  "Apply in 2 steps — pitch + portfolio",
  "Get notified instantly for new opportunities",
  "Direct chat with brands — no middlemen",
  "Build your portfolio and get discovered",
];

const TESTIMONIALS = [
  {
    quote:
      "We found 3 perfect creators for our summer campaign in under 48 hours. The matching is incredibly accurate.",
    author: "Priya Sharma",
    role: "Marketing Head, FashionNova India",
    type: "brand" as const,
  },
  {
    quote:
      "Finally a platform that doesn't make me fill out 20 fields to apply. Pitch, portfolio, done. I've landed 5 collabs.",
    author: "Arjun Mehta",
    role: "Lifestyle Creator, 120K followers",
    type: "influencer" as const,
  },
  {
    quote:
      "The realtime chat changed everything. No more email chains, no more WhatsApp groups. It's all in one place.",
    author: "Sneha Iyer",
    role: "Brand Manager, HealthifyMe",
    type: "brand" as const,
  },
];

export default function LandingPage() {
  return (
    <AuthRedirect>
      <div className="min-h-screen bg-black text-[#fbfbef] font-sans">
        {/* ═══════════════════════ NAVIGATION ═══════════════════════ */}
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/80 border-b border-[rgba(251,251,239,0.06)]">
          <div className="max-w-7xl w-full mx-auto px-6 md:px-12 h-16 flex justify-between items-center">
            <div className="text-lg font-bold tracking-tight">BRAND</div>
            <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-[rgba(251,251,239,0.5)]">
              <a href="#how-it-works" className="hover:text-[#fbfbef] transition-colors">
                How it Works
              </a>
              <a href="#testimonials" className="hover:text-[#fbfbef] transition-colors">
                Testimonials
              </a>
              <a href="#get-started" className="hover:text-[#fbfbef] transition-colors">
                Get Started
              </a>
            </nav>
            <div className="flex items-center gap-3">
              <Link
                href="/auth/signin"
                className="text-xs font-semibold text-[rgba(251,251,239,0.6)] hover:text-[#fbfbef] transition-colors hidden sm:inline-flex"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-full bg-[#fbfbef] text-black font-bold px-5 py-2 text-xs hover:opacity-90 transition-opacity"
              >
                Get Started
              </Link>
            </div>
          </div>
        </header>

        {/* ═══════════════════════ SECTION 1: HERO ═══════════════════════ */}
        <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-16 overflow-hidden">
          {/* Gradient orbs */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(251,251,239,0.04)_0%,transparent_70%)] blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(196,132,252,0.03)_0%,transparent_70%)] blur-3xl pointer-events-none" />

          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-[#0d0d0d] border border-[rgba(251,251,239,0.12)] px-4 py-1.5 text-[10px] uppercase font-bold tracking-wider text-[#4ade80] mb-8 animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4ade80]" />
            </span>
            <span>Now Live — Join 2,500+ users</span>
          </div>

          {/* Headline */}
          <h1 className="text-[clamp(2.25rem,6vw,3.5rem)] font-bold tracking-tight max-w-3xl leading-[1.1] mb-6 animate-fade-in-up [animation-delay:100ms]">
            Where Brands Meet{" "}
            <span className="relative">
              Creators
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#c084fc] via-[#fbfbef] to-[#38bdf8] opacity-50" />
            </span>
            . Simply.
          </h1>

          {/* Subtitle */}
          <p className="text-[clamp(0.8125rem,2vw,1.125rem)] text-[rgba(251,251,239,0.55)] max-w-lg leading-relaxed mb-10 animate-fade-in-up [animation-delay:200ms]">
            Post a collaboration. Get matched. Chat. Ship.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center animate-fade-in-up [animation-delay:300ms]">
            <Link
              href="/auth/signup?role=brand"
              className="w-full sm:w-auto rounded-full bg-[#fbfbef] text-black font-bold px-8 py-3.5 text-sm hover:opacity-90 transition-all shadow-[0_0_30px_rgba(251,251,239,0.15)] hover:shadow-[0_0_50px_rgba(251,251,239,0.25)]"
            >
              Start as a Brand
            </Link>
            <Link
              href="/auth/signup?role=influencer"
              className="w-full sm:w-auto rounded-full bg-transparent border border-[rgba(251,251,239,0.2)] hover:border-[rgba(251,251,239,0.5)] px-8 py-3.5 text-sm font-bold text-[#fbfbef] transition-all"
            >
              I'm a Creator
            </Link>
          </div>

          {/* Social proof stats */}
          <LandingAnimations />

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[rgba(251,251,239,0.3)] animate-bounce">
            <span className="text-[9px] uppercase tracking-widest font-medium">Scroll</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </section>

        {/* ═══════════════════════ SECTION 2: HOW IT WORKS ═══════════════════════ */}
        <section id="how-it-works" className="relative py-24 md:py-32 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16 md:mb-20">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[rgba(251,251,239,0.4)] block mb-4">
                How it Works
              </span>
              <h2 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-tight">
                Three steps. Zero friction.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
              {STEPS.map((step, i) => (
                <div
                  key={step.number}
                  className="group relative rounded-2xl bg-[#0a0a0a] border border-[rgba(251,251,239,0.08)] p-8 hover:border-[rgba(251,251,239,0.2)] transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Step number */}
                  <div className="text-[64px] font-bold leading-none text-[rgba(251,251,239,0.04)] absolute top-4 right-6 select-none">
                    {step.number}
                  </div>

                  <div className="text-3xl mb-6">{step.icon}</div>

                  <h3 className="text-lg font-bold mb-3 text-[#fbfbef]">
                    {step.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-[rgba(251,251,239,0.5)]">
                    {step.description}
                  </p>

                  {/* Connector line (desktop only, except last) */}
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 w-6 border-t border-dashed border-[rgba(251,251,239,0.1)]" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════ SECTION 3: SOCIAL PROOF ═══════════════════════ */}
        <section id="testimonials" className="relative py-24 md:py-32 px-6 bg-[#050505]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[rgba(251,251,239,0.4)] block mb-4">
                Trusted by Brands & Creators
              </span>
              <h2 className="text-3xl md:text-[2.5rem] font-bold tracking-tight">
                Hear from our community
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-[#0a0a0a] border border-[rgba(251,251,239,0.08)] p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, j) => (
                        <svg key={j} className="w-3.5 h-3.5 text-[#fbbf24]" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-[13px] leading-relaxed text-[rgba(251,251,239,0.65)] mb-6">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                  </div>
                  <div className="border-t border-[rgba(251,251,239,0.06)] pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c084fc] to-[#38bdf8] flex items-center justify-center text-xs font-bold text-white">
                        {t.author.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{t.author}</p>
                        <p className="text-[10px] text-[rgba(251,251,239,0.4)]">{t.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════ SECTION 4: SPLIT CTA ═══════════════════════ */}
        <section id="get-started" className="relative py-24 md:py-32 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-[2.5rem] font-bold tracking-tight">
                Ready to start?
              </h2>
              <p className="text-sm text-[rgba(251,251,239,0.5)] mt-3">
                Whether you're a brand or creator — it's free to join.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Brand panel */}
              <div className="rounded-2xl bg-[#0a0a0a] border border-[rgba(251,251,239,0.1)] p-8 md:p-10 flex flex-col justify-between hover:border-[rgba(251,251,239,0.2)] transition-all duration-300">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#c084fc] block mb-3">
                    For Brands
                  </span>
                  <h3 className="text-xl font-bold mb-4">
                    Find the perfect creators for your campaign
                  </h3>
                  <ul className="space-y-3 mb-8">
                    {BRAND_BENEFITS.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-[13px] text-[rgba(251,251,239,0.6)]">
                        <svg className="w-4 h-4 text-[#4ade80] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href="/auth/signup?role=brand"
                  className="block text-center rounded-full bg-[#fbfbef] text-black font-bold px-6 py-3.5 text-sm hover:opacity-90 transition-opacity"
                >
                  Post Free →
                </Link>
              </div>

              {/* Creator panel */}
              <div className="rounded-2xl bg-[#0a0a0a] border border-[rgba(251,251,239,0.1)] p-8 md:p-10 flex flex-col justify-between hover:border-[rgba(251,251,239,0.2)] transition-all duration-300">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#38bdf8] block mb-3">
                    For Creators
                  </span>
                  <h3 className="text-xl font-bold mb-4">
                    Get discovered by brands in your niche
                  </h3>
                  <ul className="space-y-3 mb-8">
                    {CREATOR_BENEFITS.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-[13px] text-[rgba(251,251,239,0.6)]">
                        <svg className="w-4 h-4 text-[#4ade80] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href="/auth/signup?role=influencer"
                  className="block text-center rounded-full border border-[rgba(251,251,239,0.2)] hover:border-[#fbfbef] text-[#fbfbef] font-bold px-6 py-3.5 text-sm transition-all"
                >
                  Join Free →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════ SECTION 5: FOOTER ═══════════════════════ */}
        <footer className="border-t border-[rgba(251,251,239,0.06)] py-12 px-6 bg-[#050505]">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
              <div>
                <div className="text-lg font-bold tracking-tight mb-3">BRAND</div>
                <p className="text-[11px] text-[rgba(251,251,239,0.4)] leading-relaxed">
                  The simplest marketplace for brand-creator partnerships.
                </p>
              </div>
              <div>
                <h4 className="text-[10px] uppercase tracking-[0.15em] font-bold text-[rgba(251,251,239,0.5)] mb-4">
                  Platform
                </h4>
                <ul className="space-y-2.5">
                  <li><a href="#how-it-works" className="text-xs text-[rgba(251,251,239,0.4)] hover:text-[#fbfbef] transition-colors">How it Works</a></li>
                  <li><Link href="/auth/signup?role=brand" className="text-xs text-[rgba(251,251,239,0.4)] hover:text-[#fbfbef] transition-colors">For Brands</Link></li>
                  <li><Link href="/auth/signup?role=influencer" className="text-xs text-[rgba(251,251,239,0.4)] hover:text-[#fbfbef] transition-colors">For Creators</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[10px] uppercase tracking-[0.15em] font-bold text-[rgba(251,251,239,0.5)] mb-4">
                  Legal
                </h4>
                <ul className="space-y-2.5">
                  <li><a href="/privacy" className="text-xs text-[rgba(251,251,239,0.4)] hover:text-[#fbfbef] transition-colors">Privacy Policy</a></li>
                  <li><a href="/terms" className="text-xs text-[rgba(251,251,239,0.4)] hover:text-[#fbfbef] transition-colors">Terms of Service</a></li>
                  <li><a href="/cookies" className="text-xs text-[rgba(251,251,239,0.4)] hover:text-[#fbfbef] transition-colors">Cookie Policy</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[10px] uppercase tracking-[0.15em] font-bold text-[rgba(251,251,239,0.5)] mb-4">
                  Support
                </h4>
                <ul className="space-y-2.5">
                  <li><Link href="/support" className="text-xs text-[rgba(251,251,239,0.4)] hover:text-[#fbfbef] transition-colors">Help Center</Link></li>
                  <li><a href="mailto:support@brand.com" className="text-xs text-[rgba(251,251,239,0.4)] hover:text-[#fbfbef] transition-colors">Contact</a></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-[rgba(251,251,239,0.06)] pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-[10px] text-[rgba(251,251,239,0.3)]">
                © {new Date().getFullYear()} Brand. Made with care in India.
              </div>
              <div className="flex items-center gap-4">
                <a href="#" className="text-[rgba(251,251,239,0.3)] hover:text-[#fbfbef] transition-colors" aria-label="Twitter">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="#" className="text-[rgba(251,251,239,0.3)] hover:text-[#fbfbef] transition-colors" aria-label="Instagram">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                <a href="#" className="text-[rgba(251,251,239,0.3)] hover:text-[#fbfbef] transition-colors" aria-label="LinkedIn">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </AuthRedirect>
  );
}
