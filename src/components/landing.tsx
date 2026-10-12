"use client";

import React from "react";
import Image from "next/image";
import AzureLoginButton from "./auth/azure-sign-in-button";
import ThemeToggle from "./shell/theme-toggle";
import { ShieldCheck, GitFork, Activity, CheckCircle2, Lock } from "lucide-react";

export default function Landing() {
  return (
    <main className="relative flex min-h-screen w-full flex-col lg:flex-row bg-background text-foreground transition-colors duration-200">
      
      {/* ── Left Editorial Showcase (Desktop) ── */}
      <section className="relative hidden lg:flex lg:w-7/12 flex-col justify-between overflow-hidden bg-slate-50 p-12 xl:p-16 text-slate-900 border-r border-slate-200 dark:bg-[#071322] dark:text-white dark:border-slate-800/80">
        {/* Subtle Architectural Blueprint Grid */}
        <div 
          className="absolute inset-0 text-slate-900 dark:text-white opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />
        {/* Top Branding Strip */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white backdrop-blur-md p-1.5 border border-slate-200 dark:bg-white/10 dark:border-white/15 shadow-sm">
            <Image
              src="/stilogo.png"
              alt="STI Crest"
              width={36}
              height={36}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
              STI College
            </p>
            <h2 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
              Clearance & Credential Gateway
            </h2>
          </div>
        </div>

        {/* Center Narrative */}
        <div className="relative z-10 my-auto max-w-xl py-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 mb-6">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
            <span>Official Institutional Protocol</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Centralized Clearance & Credential Verification Protocol
          </h1>

          <p className="mt-4 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            A unified, prerequisite-enforced digital signing ecosystem connecting students, academic departments, and registrars for end-of-term graduation and enrollment clearance.
          </p>

          {/* Institutional Pillars */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04] p-4 backdrop-blur-xs">
              <GitFork className="h-5 w-5 text-amber-700 dark:text-amber-400 mb-2" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Prerequisite Order</h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">Hierarchical unlocking: Cashier to Department to Registrar.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04] p-4 backdrop-blur-xs">
              <Activity className="h-5 w-5 text-emerald-700 dark:text-emerald-400 mb-2" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Live Audit</h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">Instant status tracking, milestone certificates, and remarks.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04] p-4 backdrop-blur-xs">
              <Lock className="h-5 w-5 text-sky-700 dark:text-sky-400 mb-2" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Campus SSO</h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">Zero-trust single sign-on via Microsoft Entra ID.</p>
            </div>
          </div>
        </div>

        {/* Bottom Status Ticker */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/10 pt-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-semibold text-slate-600 dark:text-slate-300">Academic Year 2026–2027 Clearance Active</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">Build v2.4</span>
        </div>
      </section>

      {/* ── Right Authentication Column (All Viewports) ── */}
      <section className="relative flex flex-1 flex-col justify-between p-6 sm:p-12 lg:p-16">
        {/* Top Action Bar with Theme Toggle */}
        <div className="flex items-center justify-between w-full">
          {/* Mobile Top Brand */}
          <div className="flex lg:hidden items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#071322] p-1 border border-slate-700">
              <Image
                src="/stilogo.png"
                alt="STI Crest"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                STI College
              </p>
              <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Clearance Portal
              </h2>
            </div>
          </div>

          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        {/* Center Auth Card */}
        <div className="mx-auto w-full max-w-sm py-12 my-auto">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 transition-[background-color,border-color,box-shadow] duration-200 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out">
            <div className="flex items-center justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/80 p-2 shadow-2xs dark:bg-slate-800 dark:border-slate-700">
                <Image
                  src="/stilogo.png"
                  alt="STI Crest"
                  width={48}
                  height={48}
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                Portal Authentication
              </h1>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Sign in with your official STI Office 365 academic or faculty account to proceed.
              </p>
            </div>

            {/* Microsoft Entra ID Action */}
            <AzureLoginButton />

            <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200/70 p-3 text-[11px] text-slate-500 leading-relaxed dark:bg-slate-800/50 dark:border-slate-700/60 dark:text-slate-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Access is restricted to authorized STI students, faculty members, and clearance signatories.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-400 dark:text-slate-500">
          <p>Protected by STI Information Systems Security • © WebC, Inc. All rights reserved.</p>
        </div>
      </section>
    </main>
  );
}
