import { useEffect } from "react";
import { DidTableEffectsPropType, PaginatedResponse } from "./DidTableTypes";
import { useEthersHook } from "../../hooks/use-ethers.hook";
import useDidRegister from "./use-did-register";

export const useDidTableEffects = ({
  setDidControllers,
  setVersionHashes,
  setVersionInfos,
  setMetadataVersionIds,
  metadataVersionIds,
  setMetadata,
  setTimestampsIds,
  setAdministratorLastHash,
  didRecord,
  identifier,
  versionHashes,
  walletAddress,
  setDidRecordsIds,
}: DidTableEffectsPropType) => {
  const { didRegistryContract } = useEthersHook();
  const {
    getDidRecordIdentifiersByControllerId,
    getDidDocumentVersionDidTimestampIds,
    getDidDocumentVersionMetadataIds,
    getDidDocumentVersionMetadata,
    getDidDocumentVersionInfo,
    getDidDocumentVersionIds,
  } = useDidRegister();

  useEffect(() => {
    getDidRecordIdentifiersByControllerId().then((data: PaginatedResponse) => {
      setDidRecordsIds(data.items);
    });
  }, [getDidRecordIdentifiersByControllerId, setDidRecordsIds]);

  useEffect(() => {
    getDidDocumentVersionDidTimestampIds(versionHashes, didRecord).then(
      (data: any) => {
        setTimestampsIds(data);
      }
    );
  }, [
    didRecord,
    getDidDocumentVersionDidTimestampIds,
    setTimestampsIds,
    versionHashes,
  ]);

  useEffect(() => {
    if (didRecord.controllerIds) {
      setDidControllers(didRecord.controllerIds);
    }
  }, [didRecord, setDidControllers]);

  useEffect(() => {
    getDidDocumentVersionMetadataIds(versionHashes)
      .then((data: PaginatedResponse) => {
        setMetadataVersionIds(data.items);
      })
      .catch(() => {});
  }, [getDidDocumentVersionMetadataIds, setMetadataVersionIds, versionHashes]);

  useEffect(() => {
    getDidDocumentVersionMetadata(metadataVersionIds).then((data: any) => {
      setMetadata(data);
    });
  }, [getDidDocumentVersionMetadata, metadataVersionIds, setMetadata]);

  useEffect(() => {
    getDidDocumentVersionIds(didRecord)
      .then((didVersionIds: PaginatedResponse) => {
        setVersionHashes(didVersionIds.items);
      })
      .catch(() => {});
  }, [didRecord, getDidDocumentVersionIds, setVersionHashes]);

  useEffect(() => {
    getDidDocumentVersionInfo(versionHashes).then(
      (versionInfosTemp: string[]) => {
        setVersionInfos(versionInfosTemp);
      }
    );
  }, [getDidDocumentVersionInfo, setVersionInfos, versionHashes]);

  useEffect(() => {
    if (!didRegistryContract || !identifier) {
      return;
    }
    didRegistryContract
      .getAdministrator(identifier)
      .then((administratorLastHash: string[]) => {
        setAdministratorLastHash(administratorLastHash);
      })
      .catch(() => {});
  }, [
    didRegistryContract,
    identifier,
    setAdministratorLastHash,
    walletAddress,
  ]);
};
