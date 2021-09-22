import { ethers } from "ethers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { notification } from "antd";
import { useEthersHook } from "../../hooks/use-ethers.hook";
import { useWalletContext } from "../../components/Wallet/WalletContext";
import {
  buildDidParams,
  createDidDocument,
  getIdentifierFromWalletAddr,
} from "./DidUtils";

type DidRecordDataType = {};

export default function useDidRegister() {
  const { didRegistryContract, registryContract } = useEthersHook();
  const { walletAddress } = useWalletContext();
  const { provider } = useEthersHook();
  const [loading, setLoading] = useState(true);
  const [networkId, setNetworkId] = useState(0);
  const [publicKey, setPublicKey] = useState("");
  const [didDefined, setDidDefined] = useState(false);
  const [didRecord, setDidRecord] = useState<DidRecordDataType>({});
  const [didAsAdministrator, setDidAsAdministrator] = useState(false);

  useEffect(() => {
    if (!provider) {
      return;
    }
    provider
      .getNetwork()
      .then((network) => {
        setNetworkId(network.chainId);
      })
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
      .getAdministrator(getIdentifierFromWalletAddr(walletAddress))
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
    const didEbsi = getIdentifierFromWalletAddr(walletAddress);

    didRegistryContract
      .getDidRecord(`0x${Buffer.from(didEbsi).toString("hex")}`)
      .then((didRecordData: DidRecordDataType) => {
        setDidRecord(didRecordData);
        setDidDefined(true);
      })
      .catch(() => {
        setDidDefined(false);
      });
  }, [didRegistryContract, walletAddress]);

  const didToBeSent = useMemo(() => {
    if (walletAddress && publicKey) {
      const document = createDidDocument(
        getIdentifierFromWalletAddr(walletAddress),
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
    didRecord,
  };
}
