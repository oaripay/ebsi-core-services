import crypto from "node:crypto";

const CIPHER_ALGORITHM = "aes-256-ctr";

/**
 * Returns a hex-encoded encrypted text
 * @param input UTF-8 string to encrypt
 * @param secret The secret string used to encrypt/decryp the data
 */
export const encrypt = (input: string, secret: string): string => {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash("sha256").update(secret).digest();
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([iv, cipher.update(input), cipher.final()]);

  return encrypted.toString("hex");
};

/**
 * Returns the UTF-8 decrypted text
 * @param encrypted hex-encoded string to decrypt
 * @param secret The secret string used to encrypt/decrypt the data
 */
export const decrypt = (encrypted: string, secret: string): string => {
  const key = crypto.createHash("sha256").update(secret).digest();
  const input = Buffer.from(encrypted, "hex");
  const iv = input.slice(0, 16);
  const ciphertext = input.slice(16);
  const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, key, iv);

  const decrpyted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrpyted.toString("utf8");
};
