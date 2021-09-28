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
import { DataType, DidRecordType, PaginatedResponse } from "./DidTableTypes";
import { useNotificationContext } from "../../components/Notification/Notification.context";

export default function useDidRegister() {
  const { didRegistryContract } = useEthersHook();
  const { walletAddress } = useWalletContext();
  const { setShowPendingTxNotif } = useNotificationContext();
  const { publicKey } = useRegisterDidContext();

  const getDidDocumentVersionsInfo = useCallback(
    async (versionHashes: string[]) => {
      if (!walletAddress || !didRegistryContract) {
        return [];
      }
      let promises = [];
      if (versionHashes.length) {
        promises = versionHashes.map((hash: string) =>
          didRegistryContract.getDidDocumentVersionInfo(hash).catch(() => {})
        );
        return Promise.all(promises).catch(() => []);
      }
      return [];
    },
    [didRegistryContract, walletAddress]
  );

  const getDidDocumentVersionIds = useCallback(
    async (identifier) => {
      if (!didRegistryContract || !identifier) {
        return {
          items: [],
        };
      }
      return didRegistryContract
        .getDidDocumentVersionIds(
          `0x${Buffer.from(identifier).toString("hex")}`,
          1,
          50
        )
        .catch(() => ({
          items: [],
        }));
    },
    [didRegistryContract]
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
    async (versionHashes: string[], identifier: string) => {
      if (!didRegistryContract || !versionHashes.length) {
        return [
          {
            items: [],
          },
        ];
      }
      return Promise.all(
        versionHashes.map((versionHash) =>
          didRegistryContract.getDidDocumentVersionMetadataIds(
            `0x${Buffer.from(identifier).toString("hex")}`,
            versionHash,
            1,
            50
          )
        )
      ).catch(() => {
        return [];
      });
    },
    [didRegistryContract]
  );

  const getAdministrator = useCallback(
    (identifier: string) => {
      if (!didRegistryContract) {
        return undefined;
      }

      return didRegistryContract.getAdministrator(identifier).catch(() => []);
    },
    [didRegistryContract]
  );

  const getDidRecord = useCallback(
    (identifier: string) => {
      if (!didRegistryContract || !identifier) {
        return undefined;
      }
      return didRegistryContract
        .getDidRecord(`0x${Buffer.from(identifier).toString("hex")}`)
        .catch(() => {});
    },
    [didRegistryContract]
  );

  const getDidDocumentVersionDidTimestampIds = useCallback(
    async (
      versionHashes: string[],
      didRecord: DidRecordType,
      identifier: string
    ) => {
      if (
        !didRegistryContract ||
        !versionHashes.length ||
        !Object.keys(didRecord).length
      ) {
        return [];
      }
      const promises = versionHashes.map(() => {
        return didRegistryContract
          .getDidDocumentVersionDidTimestampIds(
            `0x${Buffer.from(identifier).toString("hex")}`,
            didRecord.totalDidVersions.toNumber()
          )
          .catch(() => []);
      });
      return Promise.all(promises);
    },
    [didRegistryContract]
  );

  const getDidRecordIdentifiersByControllerId = useCallback(
    async (walletAddr) => {
      if (!didRegistryContract || !walletAddr) {
        return {
          items: [],
        };
      }
      return didRegistryContract.getDidRecordIdentifiersByControllerId(
        walletAddr,
        1,
        50
      );
    },
    [didRegistryContract]
  );

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
        setShowPendingTxNotif(true);
        await tx.wait(1);
        notification.success({
          message: "Action successful",
          description: "DID was inserted successfully!",
        });
        setShowPendingTxNotif(false);
      } catch (ex) {
        setShowPendingTxNotif(false);
        notification.error({
          message: "Error",
          description:
            "An error appeared while trying to insert the DID. Please try again",
        });
      }
    },
    [didRegistryContract, setShowPendingTxNotif]
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
      try {
        const tx = await didRegistryContract.insertDidDocument(
          identifier,
          hashAlgorithmId,
          hashValue,
          didVersionInfo,
          timestampData,
          didVersionMetadata
        );
        setShowPendingTxNotif(true);
        await tx.wait(1);
        notification.success({
          message: "Action successful",
          description: "A DID Document was inserted!",
        });
        setShowPendingTxNotif(false);
      } catch (ex) {
        setShowPendingTxNotif(false);
        notification.error({
          message: "Error",
          description:
            "An error appeared while trying to insert the DID. Please try again",
        });
      }
    },
    [didRegistryContract, publicKey, setShowPendingTxNotif]
  );

  const loadTableData = useCallback(
    async (didId): Promise<DataType | undefined> => {
      if (!didId) {
        return {
          did: "",
          didControllers: [],
          versionHashes: [],
          versionInfos: [],
          metadataVersionIds: [],
          metadata: [],
          timestampIds: [],
          administratorLastHash: [],
        };
      }
      const [didRecord, versionHashes, administratorLastHash] =
        await Promise.all([
          getDidRecord(didId),
          getDidDocumentVersionIds(didId),
          getAdministrator(didId),
        ]);
      const [timestampsIds, metadataVersionIds, versionInfos] =
        await Promise.all([
          getDidDocumentVersionDidTimestampIds(
            versionHashes.items,
            didRecord,
            didId
          ),
          getDidDocumentVersionMetadataIds(versionHashes.items, didId).then(
            (paginatedItems: PaginatedResponse[]) => {
              let items: string[] = [];
              for (const paginatedItem of paginatedItems) {
                items = [...items, ...paginatedItem.items];
              }
              return items;
            }
          ),
          getDidDocumentVersionsInfo(versionHashes.items),
        ]);

      const metadata = await getDidDocumentVersionMetadata(metadataVersionIds);
      return {
        did: didId,
        didControllers: didRecord?.controllerIds || [],
        versionHashes: versionHashes.items,
        versionInfos,
        metadataVersionIds,
        metadata,
        timestampsIds,
        administratorLastHash: administratorLastHash || [],
      };
    },
    [
      getAdministrator,
      getDidDocumentVersionDidTimestampIds,
      getDidDocumentVersionIds,
      getDidDocumentVersionMetadata,
      getDidDocumentVersionMetadataIds,
      getDidDocumentVersionsInfo,
      getDidRecord,
    ]
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
    getDidDocumentVersionsInfo,
    loadTableData,
    getDidRecord,
    getAdministrator,
  };
}
