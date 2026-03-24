import CryptoJS from 'crypto-js';

// Shared key must be exactly 32 bytes for AES-256
// This should ideally come from an environment variable in a real app
const SYMMETRIC_KEY = "xJSJGB6vtXCjeljCNQ5hD0GeQXDMRtQ/ZjMFifrYBb8=";
const key = CryptoJS.enc.Base64.parse(SYMMETRIC_KEY);

/**
 * Encrypt a JSON object into a Base64 string with random IV prepended.
 */
export const encryptPayload = (data: any): string => {
  const jsonStr = JSON.stringify(data);
  const iv = CryptoJS.lib.WordArray.random(16);
  
  const encrypted = CryptoJS.AES.encrypt(jsonStr, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  // Combine IV + Ciphertext
  const ivAndCiphertext = iv.concat(encrypted.ciphertext);
  return CryptoJS.enc.Base64.stringify(ivAndCiphertext);
};

/**
 * Decrypt a Base64 string (with prepended IV) into a JSON object.
 */
export const decryptPayload = (encryptedStr: string): any => {
  try {
    const rawData = CryptoJS.enc.Base64.parse(encryptedStr);
    
    // Extract 16-byte IV
    const iv = CryptoJS.lib.WordArray.create(rawData.words.slice(0, 4));
    // Extract Ciphertext
    const ciphertext = CryptoJS.lib.WordArray.create(rawData.words.slice(4));
    
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext } as any,
      key,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedStr);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt payload");
  }
};
