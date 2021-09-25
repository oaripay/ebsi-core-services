import { ethers } from "ethers";
import { useCallback, useMemo } from "react";
import { notification } from "antd";
import { useEthersHook } from "../../hooks/use-ethers.hook";
import { useWalletContext } from "../../components/Wallet/WalletContext";
import {
  buildDidParams,
  createDidDocument,
  getIdentifierFromWalletAddr,
} from "./DidUtils";

type PropType = {
  publicKey: string;
};

export default function useDidRegister({ publicKey }: PropType) {
  const { didRegistryContract } = useEthersHook();
  const { walletAddress } = useWalletContext();

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
    async (didUser: string) => {
      if (!didRegistryContract) {
        return;
      }
      const didAsBytes = ethers.utils.toUtf8Bytes(didUser);
      try {
        const tx = await didRegistryContract.insertAdministrator(
          didUser,
          didAsBytes
        );
        tx.wait(1).then(() => {
          notification.success({
            message: "Action successful",
            description: "DID was inserted successfully!",
          });
        });
      } catch (ex) {
        notification.error({
          message: "Error",
          description:
            "An error appeared while trying to insert the DID. Please try again",
        });
      }
    },
    [didRegistryContract]
  );

  const registerDid = useCallback(
    async (didUser: string) => {
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
    walletAddress,
    didToBeSent,
    insertDidAs,
  };
}
