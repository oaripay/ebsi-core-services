import { ethers } from "ethers";
import KeyEncoder from "key-encoder";
import EthCrypto from "eth-crypto";

const keyEncoder = new KeyEncoder("secp256k1");

export function getPublicKeyHex(publicKeyPemBase64: string): string {
  const publicKeyPem = Buffer.from(publicKeyPemBase64, "base64").toString(
    "utf8"
  );
  const publicKeyHex = keyEncoder.encodePublic(publicKeyPem, "pem", "raw");
  return publicKeyHex;
}

export function getAddress(publicKeyPemBase64: string): string {
  const publicKeySender = getPublicKeyHex(publicKeyPemBase64);
  return ethers.utils.computeAddress(`0x${publicKeySender}`);
}

export async function encrypt(
  privateKey: string,
  message: string,
  nonce: string,
  publicKeyRecipientPemBase64: string
): Promise<string> {
  const publicKeyRecipient = getPublicKeyHex(publicKeyRecipientPemBase64);
  const signature = EthCrypto.sign(
    privateKey,
    EthCrypto.hash.keccak256(`${message}__nonce:${nonce}`)
  );
  const payload = { message, signature };
  const encrypted = await EthCrypto.encryptWithPublicKey(
    publicKeyRecipient,
    JSON.stringify(payload)
  );
  return EthCrypto.cipher.stringify(encrypted);
}

export async function decrypt(
  privateKey: string,
  encrypted: string,
  nonce: string,
  publicKeySenderPemBase64: string
): Promise<string> {
  const encryptedObject = EthCrypto.cipher.parse(encrypted);
  const decrypted = await EthCrypto.decryptWithPrivateKey(
    privateKey,
    encryptedObject
  );
  const { message, signature } = JSON.parse(decrypted) as {
    message: string;
    signature: string;
  };

  if (!message || !signature)
    throw new Error("Message or signature not present in the decrypted object");

  // check signature
  const senderAddress = EthCrypto.recover(
    signature,
    EthCrypto.hash.keccak256(`${message}__nonce:${nonce}`)
  );
  const publicKeySender = getPublicKeyHex(publicKeySenderPemBase64);
  const computedAddress = ethers.utils.computeAddress(`0x${publicKeySender}`);

  if (senderAddress.toLowerCase() !== computedAddress.toLowerCase())
    throw new Error(
      `Address mismatch. Recovered address from signature: ${senderAddress}. Address from public key: ${computedAddress}`
    );

  return message;
}
