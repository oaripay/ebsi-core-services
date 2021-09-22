import { useEffect } from "react";
import {
  DidTableEffectsPropType,
  HashAlgo,
  PaginatedResponse,
} from "./DidTableTypes";
import { useEthersHook } from "../../hooks/use-ethers.hook";

export const useDidTableEffects = ({
  setDidControllers,
  setVersionHashes,
  setVersionInfos,
  setMetadataVersionIds,
  setMetadata,
  setTimestampsIds,
  setAdministrators,
  setHashAlgorithms,
  didRecord,
  identifier,
  versionHashes,
  walletAddress,
  metadataVersionIds,
}: DidTableEffectsPropType) => {
  const { didRegistryContract } = useEthersHook();
  const { registryContract } = useEthersHook();
  useEffect(() => {
    if (!didRegistryContract) {
      return;
    }
    didRegistryContract
      .getHashAlgorithms(1, 50)
      .then((hashAlgo: PaginatedResponse) => {
        const algoIds = hashAlgo.items.map((item: any) => item.toNumber());
        const algos: HashAlgo[] = [];
        const promises = hashAlgo.items.map((item: any) =>
          didRegistryContract.getHashAlgorithmById(item)
        );
        Promise.all(promises).then((data: { ianaName: string }[]) => {
          for (let i = 0; i < data.length; i += 1) {
            algos.push({
              id: algoIds[i],
              name: data[i].ianaName,
            });
          }
          setHashAlgorithms(algos);
        });
      });
  }, [didRegistryContract, setHashAlgorithms]);

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
  }, [didRecord.controllerIds, setDidControllers]);

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
    if (!registryContract || !walletAddress) {
      return;
    }
    registryContract
      .getAdministrator(identifier)
      .then((administratorsData: string[]) => {
        setAdministrators(administratorsData);
      })
      .catch(() => {});
  }, [identifier, registryContract, setAdministrators, walletAddress]);
};
