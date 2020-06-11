import { ethers } from "ethers";
import {
  ComponentWallet,
  WalletOptions,
  jwk,
} from "../../src/libs/authManager/secureEnclave";
import { generateHexPrivateKey } from "../utils/auxAPICalls";

describe("component wallet test suite", () => {
  describe("wallet builder test suite", () => {
    it("should throw with no options", async () => {
      expect.assertions(1);

      await expect(ComponentWallet.componentWalletBuilder()).rejects.toThrow(
        "Internal Server Error"
      );
    });

    it("should throw with no hexPrivateKey", async () => {
      expect.assertions(1);

      await expect(ComponentWallet.componentWalletBuilder({})).rejects.toThrow(
        "Internal Server Error"
      );
    });

    it("should return a wallet", async () => {
      expect.assertions(1);
      const hexPrivateKey = generateHexPrivateKey();
      const options: WalletOptions = {
        hexPrivateKey,
      };

      const wallet = await ComponentWallet.componentWalletBuilder(options);
      expect(wallet).toBeDefined();
    });
  });

  describe("other public component wallet calls", () => {
    it("should load a wallet", async () => {
      expect.assertions(1);
      const hexPrivateKey = generateHexPrivateKey();
      const wallet = new ComponentWallet();

      const loadedWallet = await wallet.loadFromPrivateKey(hexPrivateKey);
      expect(loadedWallet).toBeDefined();
    });

    it("should return a signature from a loaded wallet", async () => {
      expect.assertions(1);
      const hexPrivateKey = generateHexPrivateKey();
      const wallet = new ComponentWallet();
      await wallet.loadFromPrivateKey(hexPrivateKey);
      const payload = Buffer.from(JSON.stringify({ data: "some test data" }));
      const jws = wallet.signJwt(payload);
      expect(jws).toBeDefined();
    });

    it("should return the public key from a loaded wallet", async () => {
      expect.assertions(1);
      const hexPrivateKey = generateHexPrivateKey();
      const wallet = new ComponentWallet();
      await wallet.loadFromPrivateKey(hexPrivateKey);
      const pubKey = wallet.publicKey;
      const ethWallet = new ethers.Wallet(hexPrivateKey);
      expect(pubKey).toMatch(
        new ethers.utils.SigningKey(ethWallet.privateKey).publicKey
      );
    });

    it("should return the private key from a loaded wallet", async () => {
      expect.assertions(1);
      const hexPrivateKey = generateHexPrivateKey();
      const wallet = new ComponentWallet();
      await wallet.loadFromPrivateKey(hexPrivateKey);
      const { privateKey } = wallet;
      const ethWallet = new ethers.Wallet(hexPrivateKey);
      expect(privateKey).toMatch(ethWallet.privateKey);
    });

    it("should return true on hasJWK from a loaded wallet", async () => {
      expect.assertions(1);
      const hexPrivateKey = generateHexPrivateKey();
      const wallet = new ComponentWallet();
      await wallet.loadFromPrivateKey(hexPrivateKey);
      expect(wallet.hasJWK()).toBe(true);
    });

    it("should return a JWKECKey from a loaded wallet", async () => {
      expect.assertions(1);
      const hexPrivateKey = generateHexPrivateKey();
      const wallet = new ComponentWallet();
      await wallet.loadFromPrivateKey(hexPrivateKey);
      const signingKey = new ethers.utils.SigningKey(wallet.privateKey);
      const eidasKey = jwk.default(signingKey.publicKey, signingKey.privateKey);
      expect(wallet.toJWK()).toMatchObject(eidasKey.toJWK(true));
    });

    it("should return the correct did from a loaded wallet", async () => {
      expect.assertions(1);
      const hexPrivateKey = generateHexPrivateKey();
      const wallet = new ComponentWallet();
      await wallet.loadFromPrivateKey(hexPrivateKey);
      const ethWallet = new ethers.Wallet(hexPrivateKey);
      expect(wallet.getDid()).toMatch(`did:ebsi:${ethWallet.address}`);
    });

    it("should correctly decrypt the data encrypted from a loaded wallet", async () => {
      expect.assertions(1);
      const hexPrivateKey = generateHexPrivateKey();
      const wallet = new ComponentWallet();
      await wallet.loadFromPrivateKey(hexPrivateKey);
      const data = Buffer.from(JSON.stringify({ data: "some test data" }));
      expect(wallet.decrypt(wallet.encrypt(data))).toMatchObject(data);
    });
  });
});
