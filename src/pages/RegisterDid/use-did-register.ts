import { ethers } from "ethers";
import { useCallback, useMemo } from "react";
import { notification } from "antd";
import { useEthersHook } from "../../hooks/use-ethers.hook";
import { useWalletContext } from "../../components/Wallet/WalletContext";
import { buildDidParams, createDidDocument, onlyUnique } from "./DidUtils";
import { useRegisterDidContext } from "./RegisterDid.context";
import { DataType, DidRecordType } from "./DidTableTypes";
import { useNotificationContext } from "../../components/Notification/Notification.context";
import { PaginatedResponseType } from "../../shared/PaginatedResponseType";

export const LS_DID = "EBSI_DID";

export default function useDidRegister() {
  const { didRegistryContract } = useEthersHook();
  const { walletAddress } = useWalletContext();
  const { setShowPendingTxNotif } = useNotificationContext();
  const { publicKey, identifier } = useRegisterDidContext();

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
    async (didId) => {
      if (!didRegistryContract || !didId) {
        return {
          items: [],
        };
      }
      return didRegistryContract
        .getDidDocumentVersionIds(
          `0x${Buffer.from(didId).toString("hex")}`,
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
    async (versionHashes: string[], identifierForDoc: string) => {
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
            `0x${Buffer.from(identifierForDoc).toString("hex")}`,
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
    (didId: string) => {
      if (!didRegistryContract) {
        return undefined;
      }

      return didRegistryContract.getAdministrator(didId);
    },
    [didRegistryContract]
  );

  const getDidRecord = useCallback(
    (didId) => {
      if (!didRegistryContract || !didId) {
        return undefined;
      }
      return didRegistryContract
        .getDidRecord(`0x${Buffer.from(didId).toString("hex")}`)
        .catch(() => ({}));
    },
    [didRegistryContract]
  );

  const getDidDocumentVersionDidTimestampIds = useCallback(
    async (
      versionHashes: string[],
      didRecord: DidRecordType,
      identifierDoc: string
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
            `0x${Buffer.from(identifierDoc).toString("hex")}`,
            didRecord?.totalDidVersions?.toNumber()
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
      const document = createDidDocument(identifier, publicKey);
      return JSON.stringify(buildDidParams(document), null, 2);
    }
    return "";
  }, [walletAddress, publicKey, identifier]);

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
          description: "DID Admin was inserted successfully!",
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

  const getDidFromLs = useCallback((walletAddr: string) => {
    try {
      const item = localStorage.getItem(LS_DID);
      if (item) {
        return JSON.parse(item)[walletAddr];
      }
      return "";
    } catch (ex) {
      return "";
    }
  }, []);

  const registerDidToLs = useCallback(
    (did: string) => {
      if (!walletAddress) {
        return;
      }
      try {
        let currentData: { [key: string]: string } = {};
        const lsData = localStorage.getItem(LS_DID);
        if (lsData) {
          currentData = JSON.parse(lsData);
        }
        if (!currentData[walletAddress]) {
          localStorage.setItem(
            LS_DID,
            JSON.stringify({
              [walletAddress]: did,
              ...currentData,
            })
          );
        }
      } catch (ex) {
        //
      }
    },
    [walletAddress]
  );

  const registerDid = useCallback(
    async (didUser: string) => {
      const document = createDidDocument(didUser, publicKey);
      const { param } = buildDidParams(document);
      const {
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
          param.identifier,
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
        registerDidToLs(identifier);
      } catch (ex) {
        setShowPendingTxNotif(false);
        notification.error({
          message: "Error",
          description:
            "An error appeared while trying to insert the DID. Please try again",
        });
      }
    },
    [
      didRegistryContract,
      identifier,
      publicKey,
      registerDidToLs,
      setShowPendingTxNotif,
    ]
  );

  const loadTableData = useCallback(
    async (didId): Promise<DataType | undefined> => {
      if (!didId) {
        return {
          did: "",
          isAdministrator: false,
          didControllers: [],
          versionHashes: [],
          versionInfos: [],
          metadataVersionIds: [],
          metadata: [],
          timestampsIds: [],
          administratorLastHash: [],
          exists: false,
        };
      }

      const [didRecord, versionHashes] = await Promise.all([
        getDidRecord(didId),
        getDidDocumentVersionIds(didId),
      ]);
      let administratorLastHash;
      let isAdministrator;

      try {
        administratorLastHash = await getAdministrator(didId);
        isAdministrator = true;
      } catch (ex) {
        administratorLastHash = [];
        isAdministrator = false;
      }
      const [timestampsIds, metadataVersionIds, versionInfos] =
        await Promise.all([
          getDidDocumentVersionDidTimestampIds(
            versionHashes.items,
            didRecord,
            didId
          ),
          getDidDocumentVersionMetadataIds(versionHashes.items, didId).then(
            (paginatedItems: PaginatedResponseType[]) => {
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
        isAdministrator,
        exists: Object.keys(didRecord).length > 0,
        didControllers: didRecord?.controllerIds
          ? didRecord?.controllerIds.filter(onlyUnique)
          : [],

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
    registerDidToLs,
    getDidFromLs,
  };
}
