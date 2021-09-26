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
import { useRegisterDidContext } from "./RegisterDid.context";
import { DidRecordType } from "./DidTableTypes";

export default function useDidRegister() {
  const { didRegistryContract } = useEthersHook();
  const { walletAddress } = useWalletContext();

  const { publicKey } = useRegisterDidContext();

  const getDidDocumentVersionInfo = useCallback(
    async (versionHashes: string[]) => {
      if (!walletAddress || !didRegistryContract) {
        return [];
      }
      let promises = [];
      if (versionHashes.length) {
        promises = versionHashes.map((hash: string) =>
          didRegistryContract.getDidDocumentVersionInfo(hash).catch(() => {})
        );
        return Promise.all(promises);
      }
      return [];
    },
    [didRegistryContract, walletAddress]
  );

  const getDidDocumentVersionIds = useCallback(
    async (didRecord: DidRecordType) => {
      if (!didRegistryContract || !didRecord || !didRecord.controllerIds) {
        return {
          items: [],
        };
      }
      return didRegistryContract.getDidDocumentVersionIds(
        `0x${Buffer.from(getIdentifierFromWalletAddr(walletAddress)).toString(
          "hex"
        )}`,
        1,
        50
      );
    },
    [didRegistryContract, walletAddress]
  );

  const getDidDocumentVersionMetadata = useCallback(
    async (metadataVersionIds: string[]) => {
      if (!didRegistryContract || !metadataVersionIds.length) {
        return [];
      }
      const promises = metadataVersionIds.map((versionIdData: string) => {
        return didRegistryContract
          .getDidDocumentVersionMetadata(versionIdData)
          .catch(() => {});
      });
      return Promise.all(promises);
    },
    [didRegistryContract]
  );

  const getDidDocumentVersionMetadataIds = useCallback(
    async (versionHashes: string[]) => {
      if (!didRegistryContract || !versionHashes.length) {
        return {
          items: [],
        };
      }
      return didRegistryContract.getDidDocumentVersionMetadataIds(
        `0x${Buffer.from(getIdentifierFromWalletAddr(walletAddress)).toString(
          "hex"
        )}`,
        versionHashes[0],
        1,
        50
      );
    },
    [didRegistryContract, walletAddress]
  );

  const getDidDocumentVersionDidTimestampIds = useCallback(
    async (versionHashes: string[], didRecord: DidRecordType) => {
      if (!didRegistryContract || !versionHashes.length) {
        return [];
      }
      const promises = versionHashes.map(() => {
        return didRegistryContract
          .getDidDocumentVersionDidTimestampIds(
            `0x${Buffer.from(
              getIdentifierFromWalletAddr(walletAddress)
            ).toString("hex")}`,
            didRecord.totalDidVersions.toNumber()
          )
          .catch(() => {});
      });
      return Promise.all(promises);
    },
    [didRegistryContract, walletAddress]
  );

  const getDidRecordIdentifiersByControllerId = useCallback(async () => {
    if (!didRegistryContract || !walletAddress) {
      return {
        items: [],
      };
    }
    return didRegistryContract.getDidRecordIdentifiersByControllerId(
      walletAddress,
      1,
      50
    );
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
    getDidRecordIdentifiersByControllerId,
    getDidDocumentVersionDidTimestampIds,
    getDidDocumentVersionMetadataIds,
    getDidDocumentVersionMetadata,
    getDidDocumentVersionIds,
    getDidDocumentVersionInfo,
  };
}
