import * as crypto from "crypto";
import { ec as EC } from "elliptic";
import bs58 from "bs58";

import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { ethers } from "ethers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { notification } from "antd";
import { useEthersHook } from "../../hooks/use-ethers.hook";

export function createMetadata() {
  return {
    meta: crypto.randomBytes(32).toString("hex"),
  };
}

export function createTimestamp() {
  return {
    data: crypto.randomBytes(32).toString("hex"),
  };
}

export function fromHexString(hexString: string): Uint8Array {
  const match = hexString.match(/.{1,2}/g);
  if (!match) throw new Error("String could not be parsed");
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)));
}

export function createDidDocument(didUser: string, publicKey: string) {
  const ec = new EC("secp256k1");
  const key = ec.keyFromPublic(publicKey.slice(2), "hex");
  const publicKeyObj = {
    publicKeyHex: publicKey.slice(2),
    publicKeyJwk: EbsiWallet.formatPublicKey(key.getPublic(), "jwk"),
    publicKeyBase58: bs58.encode(fromHexString(publicKey.slice(2))),
  };
  return {
    "@context": "https://w3id.org/did/v1",
    id: didUser,
    verificationMethod: [
      {
        id: `${didUser}#keys-1`,
        type: "Secp256k1VerificationKey2018",
        controller: didUser,
        ...publicKeyObj,
      },
    ],
    authentication: [`${didUser}#keys-1`],
    assertionMethod: [`${didUser}#keys-1`],
  };
}

export function computeIdentifier(did: string): string {
  return `0x${Buffer.from(did).toString("hex")}`;
}

export function buildDidParams(document: any) {
  const bufferTimestamp = Buffer.from(JSON.stringify(createTimestamp()));
  const bufferDocument = Buffer.from(JSON.stringify(document));
  const bufferMetadata = Buffer.from(JSON.stringify(createMetadata()));
  const documentHash = ethers.utils.sha256(bufferDocument);
  return {
    info: {
      title: "Did document",
      data: document,
    },
    param: {
      identifier: computeIdentifier(document.id),
      hashAlgorithmId: 1, // sha256
      hashValue: documentHash,
      didVersionInfo: `0x${bufferDocument.toString("hex")}`,
      timestampData: `0x${bufferTimestamp.toString("hex")}`,
      didVersionMetadata: `0x${bufferMetadata.toString("hex")}`,
    },
  };
}

export default function useDidRegister() {
  const { didRegistryContract, registryContract } = useEthersHook();
  const { provider } = useEthersHook();
  const [loading, setLoading] = useState(true);
  const [networkId, setNetworkId] = useState(0);
  const [walletAddress, setWalletAddress] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [didDefined, setDidDefined] = useState(false);
  const [didAsAdministrator, setDidAsAdministrator] = useState(false);

  useEffect(() => {
    if (!provider) {
      return;
    }
    Promise.all([
      provider.getNetwork().then((network) => {
        setNetworkId(network.chainId);
      }),
      provider
        .getSigner()
        .getAddress()
        .then((addr: string) => {
          setWalletAddress(addr);
        })
        .catch(() => {
          setLoading(false);
        }),
    ])
      .then(() => {
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [provider]);

  useEffect(() => {
    const pbKeyFromLocalStorage: any = localStorage.getItem("did-public-key");
    const pbKeyParsed = pbKeyFromLocalStorage
      ? JSON.parse(pbKeyFromLocalStorage)
      : {};

    if (walletAddress && provider) {
      const publicKeyForAccount = pbKeyParsed ? pbKeyParsed[walletAddress] : "";

      if (!publicKeyForAccount) {
        const hash = ethers.utils.keccak256(walletAddress);
        provider
          .getSigner()
          .signMessage(hash)
          .then((signature) => {
            const {
              recoverPublicKey,
              arrayify,
              hashMessage,
              computePublicKey,
            } = ethers.utils;
            const pubKey = computePublicKey(
              recoverPublicKey(arrayify(hashMessage(hash)), signature),
              true
            );
            localStorage.setItem(
              "did-public-key",
              JSON.stringify({
                [walletAddress]: pubKey,
              })
            );
            setPublicKey(pubKey);
          });
      }
    }
  }, [walletAddress, provider]);

  useEffect(() => {
    const publicKeyFromLocalStorage = localStorage.getItem("did-public-key");
    if (publicKeyFromLocalStorage && walletAddress) {
      try {
        setPublicKey(JSON.parse(publicKeyFromLocalStorage)[walletAddress]);
      } catch (ex) {
        //
      }
    }
  }, [walletAddress]);

  useEffect(() => {
    if (!registryContract || !walletAddress) {
      return;
    }
    registryContract
      .getAdministrator(`did:ebsi:${walletAddress}`)
      .then(() => {
        setDidAsAdministrator(true);
      })
      .catch(() => {
        setDidAsAdministrator(false);
      });
  }, [registryContract, walletAddress]);

  useEffect(() => {
    if (!didRegistryContract || !walletAddress) {
      return;
    }
    const didEbsi = `did:ebsi:${walletAddress}`;

    didRegistryContract
      .getDidRecord(`0x${Buffer.from(didEbsi).toString("hex")}`)
      .then(() => {
        setDidDefined(true);
      })
      .catch(() => {
        setDidDefined(false);
      });
  }, [didRegistryContract, walletAddress]);

  const didToBeSent = useMemo(() => {
    if (walletAddress && publicKey) {
      const document = createDidDocument(
        `did:ebsi:${walletAddress}`,
        publicKey
      );
      return JSON.stringify(buildDidParams(document), null, 2);
    }
    return "";
  }, [walletAddress, publicKey]);

  const insertDidAs = useCallback(
    (didUser: string) => {
      if (!registryContract) {
        return;
      }
      const didAsBytes = ethers.utils.toUtf8Bytes(didUser);
      registryContract
        .insertAdministrator(didUser, didAsBytes)
        .then(() => {
          notification.success({
            message: "Action successful",
            description: "DID was inserted successfully!",
          });
        })
        .catch(() => {
          notification.error({
            message: "Error",
            description:
              "An error appeared while trying to insert the DID. Please try again",
          });
        });
    },
    [registryContract]
  );

  const registerDid = useCallback(
    (didUser: string) => {
      const document = createDidDocument(didUser, publicKey);
      const { param } = buildDidParams(document);
      const {
        identifier,
        hashAlgorithmId,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      } = param;

      if (!didRegistryContract) {
        return;
      }
      didRegistryContract
        .insertDidDocument(
          identifier,
          hashAlgorithmId,
          hashValue,
          didVersionInfo,
          timestampData,
          didVersionMetadata
        )
        .then(() => {
          notification.success({
            message: "Action successful",
            description: "A DID Document was inserted!",
          });
        })
        .catch(() => {
          notification.error({
            message: "Error",
            description:
              "An error appeared while trying to insert the DID. Please try again",
          });
        });
    },
    [didRegistryContract, publicKey]
  );

  return {
    registerDid,
    networkId,
    loading,
    publicKey,
    walletAddress,
    didDefined,
    didToBeSent,
    insertDidAs,
    didAsAdministrator,
  };
}
