import { ethers } from "ethers";
import { util } from "../../src/utils";
import {
  ComponentWallet,
  WalletOptions,
  jwk,
} from "../../src/libs/authManager/secureEnclave";

const password = "00-temp-pass";
const key = util.generateKeys();
const ethWallet = new ethers.Wallet(util.toHex(<string>key.d));

describe("component wallet test suite", () => {
  describe("wallet builder test suite", () => {
    it("should throw with no options", async () => {
      expect.assertions(1);

      await expect(ComponentWallet.componentWalletBuilder()).rejects.toThrow(
        "Internal Server Error"
      );
    });

    it("should throw with no password", async () => {
      expect.assertions(1);

      await expect(ComponentWallet.componentWalletBuilder({})).rejects.toThrow(
        "Internal Server Error"
      );
    });

    it("should throw with no encryptedKey", async () => {
      expect.assertions(1);
      const options = {
        password: "a password",
      };

      await expect(
        ComponentWallet.componentWalletBuilder(options)
      ).rejects.toThrow("Internal Server Error");
    });

    it("should return a wallet", async () => {
      expect.assertions(1);
      const encryptedKey = await ethWallet.encrypt(password);
      const options: WalletOptions = {
        password,
        encryptedKey,
      };

      const wallet = await ComponentWallet.componentWalletBuilder(options);
      expect(wallet).toBeDefined();
    });
  });

  describe("other public component wallet calls", () => {
    it("should not throw on init", async () => {
      expect.assertions(1);
      const wallet = new ComponentWallet();

      expect(
        await Promise.resolve(wallet.initWithPass(password))
      ).not.toBeDefined();
    });

    it("should not throw on initFromECKeys", async () => {
      expect.assertions(1);
      const wallet = new ComponentWallet();

      expect(
        await Promise.resolve(wallet.initFromECKeys(key, password))
      ).not.toBeDefined();
    });

    it("should load a wallet", async () => {
      expect.assertions(1);
      const encryptedKey = await ethWallet.encrypt(password);
      const wallet = new ComponentWallet();

      const loadedWallet = await wallet.loadFromEncryptedKeys(
        encryptedKey,
        password
      );
      expect(loadedWallet).toBeDefined();
    });

    it("should return encrypted keys from a loaded wallet", async () => {
      expect.assertions(1);
      const encryptedKey = await ethWallet.encrypt(password);
      const wallet = new ComponentWallet();
      await wallet.loadFromEncryptedKeys(encryptedKey, password);
      const outEncryptedKey = wallet.exportEncryptedKeys();
      expect(outEncryptedKey).toMatch(encryptedKey);
    });

    it("should return a signature from a loaded wallet", async () => {
      expect.assertions(1);
      const encryptedKey = await ethWallet.encrypt(password);
      const wallet = new ComponentWallet();
      await wallet.loadFromEncryptedKeys(encryptedKey, password);
      const payload = Buffer.from(JSON.stringify({ data: "some test data" }));
      const jws = wallet.signJwt(payload);
      expect(jws).toBeDefined();
    });

    it("should return the public key from a loaded wallet", async () => {
      expect.assertions(1);
      const encryptedKey = await ethWallet.encrypt(password);
      const wallet = new ComponentWallet();
      await wallet.loadFromEncryptedKeys(encryptedKey, password);
      const pubKey = wallet.publicKey;
      expect(pubKey).toMatch(
        new ethers.utils.SigningKey(ethWallet.privateKey).publicKey
      );
    });

    it("should return the private key from a loaded wallet", async () => {
      expect.assertions(1);
      const encryptedKey = await ethWallet.encrypt(password);
      const wallet = new ComponentWallet();
      await wallet.loadFromEncryptedKeys(encryptedKey, password);
      const { privateKey } = wallet;
      expect(privateKey).toMatch(ethWallet.privateKey);
    });

    it("should return true on hasJWK from a loaded wallet", async () => {
      expect.assertions(1);
      const encryptedKey = await ethWallet.encrypt(password);
      const wallet = new ComponentWallet();
      await wallet.loadFromEncryptedKeys(encryptedKey, password);
      expect(wallet.hasJWK()).toBe(true);
    });

    it("should return a JWKECKey from a loaded wallet", async () => {
      expect.assertions(1);
      const encryptedKey = await ethWallet.encrypt(password);
      const wallet = new ComponentWallet();
      await wallet.loadFromEncryptedKeys(encryptedKey, password);
      const signingKey = new ethers.utils.SigningKey(wallet.privateKey);
      const eidasKey = jwk.default(signingKey.publicKey, signingKey.privateKey);
      expect(wallet.toJWK()).toMatchObject(eidasKey.toJWK(true));
    });

    it("should return the correct did from a loaded wallet", async () => {
      expect.assertions(1);
      const encryptedKey = await ethWallet.encrypt(password);
      const wallet = new ComponentWallet();
      await wallet.loadFromEncryptedKeys(encryptedKey, password);
      expect(wallet.getDid()).toMatch(`did:ebsi:${ethWallet.address}`);
    });

    it("should correctly decrypt the data encrypted from a loaded wallet", async () => {
      expect.assertions(1);
      const encryptedKey = await ethWallet.encrypt(password);
      const wallet = new ComponentWallet();
      await wallet.loadFromEncryptedKeys(encryptedKey, password);
      const data = Buffer.from(JSON.stringify({ data: "some test data" }));
      expect(wallet.decrypt(wallet.encrypt(data))).toMatchObject(data);
    });
  });
});
