"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useUser } from "@/lib/hooks/useUser";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useUser();

  // Extract step number from path (e.g. /onboarding/step-2 -> 2)
  const stepMatch = pathname.match(/\/onboarding\/step-(\d+)/);
  const currentStep = stepMatch ? parseInt(stepMatch[1], 10) : 1;
  const progressPercent = (currentStep / 5) * 100;

  const handleBack = () => {
    if (currentStep > 1) {
      router.push(`/onboarding/step-${currentStep - 1}`);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg text-text-primary">
        <div className="space-y-4 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-accent mx-auto" />
          <p className="text-sm font-sans tracking-wide text-text-secondary">
            Loading Onboarding...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col font-sans">
      {/* Dynamic Progress Bar */}
      <div className="w-full h-1 bg-surface-2 relative">
        <motion.div
          className="absolute left-0 top-0 h-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Panel: Desktop Decorative Side Panel */}
        <div className="hidden md:flex md:w-1/3 bg-surface border-r border-border p-12 flex-col justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Brand</h1>
            <p className="text-xs text-text-secondary mt-2">
              Collaborations simplified. Connect, agree, and verify.
            </p>
          </div>
          <div className="space-y-4">
            <div className="text-xs text-text-muted">
              Step {currentStep} of 5
            </div>
            <div className="text-lg font-bold">
              {currentStep === 1 && "Welcome to the Platform"}
              {currentStep === 2 && (profile?.role === "brand" ? "Establish Identity" : "Creator Profile")}
              {currentStep === 3 && (profile?.role === "brand" ? "Visual Representation" : "Categorize Content")}
              {currentStep === 4 && (profile?.role === "brand" ? "Campaign Target & Budget" : "Connect Social Media")}
              {currentStep === 5 && "Launch Your Journey"}
            </div>
          </div>
        </div>

        {/* Right Panel: Content Area */}
        <div className="flex-1 flex flex-col p-6 md:p-12 justify-center items-center">
          <div className="w-full max-w-[600px] relative">
            {/* Back Button */}
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="absolute -top-12 left-0 flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors scale-active focus:outline-none"
              >
                <ArrowLeft className="size-4" />
                <span>Back</span>
              </button>
            )}

            {/* Mobile Header Info */}
            <div className="flex md:hidden items-center justify-between mb-8 text-xs text-text-secondary">
              <span className="font-extrabold">Brand</span>
              <span>Step {currentStep} of 5</span>
            </div>

            {/* Step Component */}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
