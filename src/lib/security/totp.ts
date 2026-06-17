import crypto from "crypto";

export function generateSecret(length = 16): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  for (let i = 0; i < length; i++) {
    secret += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return secret;
}

function decodeBase32(base32: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = base32.toUpperCase().replace(/=+$/, "");
  const len = cleaned.length;
  
  const buffer = Buffer.alloc(Math.floor((len * 5) / 8));
  let val = 0;
  let bits = 0;
  let index = 0;

  for (let i = 0; i < len; i++) {
    const char = cleaned[i];
    const idx = alphabet.indexOf(char);
    if (idx === -1) {
      throw new Error("Invalid base32 character");
    }
    val = (val << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      if (index < buffer.length) {
        buffer[index++] = (val >> (bits - 8)) & 0xff;
      }
      bits -= 8;
    }
  }
  return buffer;
}

export function verifyTOTP(token: string, secret: string, window = 1): boolean {
  try {
    const key = decodeBase32(secret);
    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / 30);

    for (let i = -window; i <= window; i++) {
      const cVal = counter + i;
      
      // Convert counter to 8-byte big-endian buffer
      const buffer = Buffer.alloc(8);
      let temp = cVal;
      for (let j = 7; j >= 0; j--) {
        buffer[j] = temp & 0xff;
        temp = Math.floor(temp / 256);
      }

      const hmac = crypto.createHmac("sha1", key);
      hmac.update(buffer);
      const hmacResult = hmac.digest();

      // Dynamic truncation
      const offset = hmacResult[hmacResult.length - 1] & 0xf;
      const code =
        (((hmacResult[offset] & 0x7f) << 24) |
          ((hmacResult[offset + 1] & 0xff) << 16) |
          ((hmacResult[offset + 2] & 0xff) << 8) |
          (hmacResult[offset + 3] & 0xff)) %
        1000000;

      if (code.toString().padStart(6, "0") === token.trim()) {
        return true;
      }
    }
  } catch (err) {
    console.error("verifyTOTP error:", err);
  }
  return false;
}

export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    codes.push(code);
  }
  return codes;
}
