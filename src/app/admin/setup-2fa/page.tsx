"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import QRCode from "qrcode";

export default function Setup2FAPage() {
  const [setupData, setSetupData] = useState<any>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const router = useRouter();

  const loadSetupDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/2fa/setup");
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setSetupData(data);
    } catch (err) {
      toast.error("Failed to load 2FA setup details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSetupDetails();
  }, []);

  // Generate QR code as data URL client-side
  useEffect(() => {
    if (setupData?.otpauthUrl) {
      QRCode.toDataURL(setupData.otpauthUrl, {
        width: 200,
        margin: 1,
        color: { dark: "#000000", light: "#FFFFFF" },
      })
        .then((url: string) => setQrDataUrl(url))
        .catch(() => toast.error("Failed to generate QR code"));
    }
  }, [setupData?.otpauthUrl]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      toast.error("Please enter a valid 6-digit code.");
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch("/api/admin/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        setVerifying(false);
        return;
      }

      toast.success("MFA Setup completed successfully! Redirecting...");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      toast.error("Verification failed.");
      setVerifying(false);
    }
  };

  const handleDownloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;
    const element = document.createElement("a");
    const file = new Blob([setupData.backupCodes.join("\n")], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "brand_admin_backup_codes.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Backup codes downloaded!");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 py-12">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="h-8 w-64 mx-auto skeleton" />
          <div className="h-4 w-96 mx-auto skeleton" />
          <div className="h-40 w-40 mx-auto skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6 py-12">
      <div className="w-full max-w-xl space-y-8 rounded-2xl bg-[#0d0d0d] p-8 border border-[rgba(251,251,239,0.2)] shadow-glow">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#fbfbef]">
            Mandatory Admin 2FA Setup
          </h1>
          <p className="mt-2 text-sm text-[rgba(251,251,239,0.6)]">
            To secure the platform, all administrators are required to enable Multi-Factor Authentication.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 pt-4">
          {/* Scan QR */}
          <div className="flex flex-col items-center justify-center border border-[rgba(251,251,239,0.1)] p-4 rounded-xl bg-black/40 text-center space-y-4">
            <span className="text-[10px] font-bold text-[rgba(251,251,239,0.5)] uppercase tracking-wider block">
              1. Scan this QR Code
            </span>
            <div className="p-2 bg-white rounded-lg inline-block">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="2FA QR Code"
                  className="h-40 w-40 object-contain"
                />
              ) : (
                <div className="h-40 w-40 skeleton" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-[rgba(251,251,239,0.4)]">
                Can&apos;t scan? Enter this base32 secret manually:
              </p>
              <code className="text-xs bg-[#141414] px-2.5 py-1.5 rounded-md border border-[rgba(251,251,239,0.1)] font-mono text-[var(--color-text-primary)] block break-all">
                {setupData?.secret}
              </code>
            </div>
          </div>

          {/* Backup Codes */}
          <div className="flex flex-col justify-between border border-[rgba(251,251,239,0.1)] p-4 rounded-xl bg-black/40">
            <div>
              <span className="text-[10px] font-bold text-[rgba(251,251,239,0.5)] uppercase tracking-wider block mb-2">
                2. Download Backup Codes
              </span>
              <p className="text-[10px] text-[rgba(251,251,239,0.4)] mb-3 leading-relaxed">
                Save these backup codes in a safe place. They will allow you to access your account if you lose your device.
              </p>
              
              <div className="grid grid-cols-2 gap-2 font-mono text-xs text-[var(--color-text-secondary)] bg-[#141414] p-3 rounded-lg border border-[rgba(251,251,239,0.1)]">
                {setupData?.backupCodes?.map((code: string) => (
                  <span key={code} className="text-center">{code}</span>
                ))}
              </div>
            </div>

            <button
              onClick={handleDownloadBackupCodes}
              className="mt-4 w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-semibold text-xs py-2 rounded-lg hover:bg-[var(--color-surface-3)] transition-all scale-active cursor-pointer"
            >
              Download Backup Codes
            </button>
          </div>
        </div>

        {/* Verification code form */}
        <form onSubmit={handleVerify} className="space-y-4 pt-4 border-t border-[rgba(251,251,239,0.1)]">
          <div className="max-w-xs mx-auto text-center space-y-2">
            <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider block">
              3. Verify 6-digit code
            </label>
            <input
              type="text"
              required
              maxLength={6}
              placeholder="e.g. 123456"
              className="block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-center text-lg font-mono tracking-[0.4em] text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").substring(0, 6))}
            />
          </div>

          <button
            type="submit"
            disabled={verifying || code.length !== 6}
            className="w-full bg-[#fbfbef] text-black font-semibold text-sm py-3 rounded-full hover:opacity-90 transition-all scale-active disabled:opacity-50 cursor-pointer"
          >
            {verifying ? "Verifying..." : "Verify & Enable MFA"}
          </button>
        </form>
      </div>
    </div>
  );
}
