import { useEffect } from "react";
import { DidTableEffectsPropType, PaginatedResponse } from "./DidTableTypes";
import { useEthersHook } from "../../hooks/use-ethers.hook";

export const useDidTableEffects = ({
  setDidControllers,
  setVersionHashes,
  setVersionInfos,
  setMetadataVersionIds,
  setMetadata,
  setTimestampsIds,
  setAdministratorLastHash,
  didRecord,
  identifier,
  versionHashes,
  walletAddress,
  metadataVersionIds,
  setDidRecordsIds,
}: DidTableEffectsPropType) => {
  const { didRegistryContract } = useEthersHook();

  useEffect(() => {
    if (!didRegistryContract || !walletAddress) {
      return;
    }
    didRegistryContract
      .getDidRecordIdentifiersByControllerId(walletAddress, 1, 50)
      .then((data: PaginatedResponse) => {
        setDidRecordsIds(data.items);
      });
  }, [didRegistryContract, walletAddress, setDidRecordsIds]);

  useEffect(() => {
    if (!didRegistryContract || !versionHashes.length) {
      return;
    }
    const promises = versionHashes.map(() => {
      return didRegistryContract
        .getDidDocumentVersionDidTimestampIds(
          `0x${Buffer.from(identifier).toString("hex")}`,
          didRecord.totalDidVersions.toNumber()
        )
        .catch(() => {});
    });
    Promise.all(promises).then((data) => {
      setTimestampsIds(data);
    });
  }, [
    didRecord.totalDidVersions,
    didRegistryContract,
    identifier,
    setTimestampsIds,
    versionHashes,
    versionHashes.length,
    walletAddress,
  ]);

  useEffect(() => {
    if (didRecord.controllerIds) {
      setDidControllers(didRecord.controllerIds);
    }
  }, [didRecord, setDidControllers]);

  useEffect(() => {
    if (!didRegistryContract || !versionHashes.length) {
      return;
    }
    didRegistryContract
      .getDidDocumentVersionMetadataIds(
        `0x${Buffer.from(identifier).toString("hex")}`,
        versionHashes[0],
        1,
        50
      )
      .then((data: any) => {
        setMetadataVersionIds(data.items);
      })
      .catch(() => {});
  }, [
    didRecord,
    didRegistryContract,
    identifier,
    setMetadataVersionIds,
    versionHashes,
    walletAddress,
  ]);

  useEffect(() => {
    if (!didRegistryContract || !metadataVersionIds.length) {
      return;
    }
    const promises = metadataVersionIds.map((versionIdData: string) => {
      return didRegistryContract
        .getDidDocumentVersionMetadata(versionIdData)
        .catch(() => {});
    });
    Promise.all(promises).then((data) => {
      setMetadata(data);
    });
  }, [didRegistryContract, metadataVersionIds, setMetadata]);

  useEffect(() => {
    if (!didRegistryContract || !didRecord || !didRecord[0]) {
      return;
    }
    didRegistryContract
      .getDidDocumentVersionIds(
        `0x${Buffer.from(identifier).toString("hex")}`,
        1,
        50
      )
      .then((didVersionIds: PaginatedResponse) => {
        console.log(didVersionIds);
        setVersionHashes(didVersionIds.items);
      })
      .catch(() => {});
    setVersionHashes([]);
  }, [
    didRecord,
    didRegistryContract,
    identifier,
    setVersionHashes,
    walletAddress,
  ]);

  useEffect(() => {
    if (!didRegistryContract || !didRecord || !didRecord[0]) {
      return;
    }
    let promises = [];
    if (versionHashes.length) {
      promises = versionHashes.map((hash: string) =>
        didRegistryContract.getDidDocumentVersionInfo(hash).catch(() => {})
      );
      Promise.all(promises).then((versionInfosTemp: string[]) => {
        setVersionInfos(versionInfosTemp);
      });
    }
  }, [didRecord, didRegistryContract, setVersionInfos, versionHashes]);

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
