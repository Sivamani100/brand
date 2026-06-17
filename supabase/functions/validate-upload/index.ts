import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MIME_WHITELIST = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

const SIZE_LIMITS: Record<string, number> = {
  avatar: 2 * 1024 * 1024,      // 2MB
  cover: 5 * 1024 * 1024,       // 5MB
  portfolio: 10 * 1024 * 1024,  // 10MB
  attachment: 20 * 1024 * 1024, // 20MB
};

const MAGIC_HEADERS: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/jpeg": (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": (bytes) =>
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47,
  "image/gif": (bytes) =>
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38,
  "application/pdf": (bytes) =>
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46,
  "image/webp": (bytes) => {
    const isRiff =
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46;
    const isWebp =
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;
    return isRiff && isWebp;
  },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { fileBase64, mimeType, uploadType, filename } = await req.json();

    // 1. Check MIME type whitelist
    if (!MIME_WHITELIST.includes(mimeType)) {
      return new Response(JSON.stringify({ allowed: false, reason: "MIME type not whitelisted." }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Decode file
    const binary = atob(fileBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // 2. Size limits check
    const limit = SIZE_LIMITS[uploadType] || 2 * 1024 * 1024;
    if (bytes.length > limit) {
      return new Response(JSON.stringify({ allowed: false, reason: "File size limit exceeded." }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 3. Filename sanitisation
    const sanitizedName = filename
      .replace(/[^a-zA-Z0-9.\-_]/g, "_")
      .replace(/\.\./g, "_");

    // 4. Magic bytes check
    const checker = MAGIC_HEADERS[mimeType];
    if (checker && !checker(bytes)) {
      return new Response(JSON.stringify({ allowed: false, reason: "Magic bytes verification failed: file header does not match MIME type." }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response(JSON.stringify({ allowed: true, sanitizedName }), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ allowed: false, reason: "Server error: " + e.message }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
