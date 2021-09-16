import React, { useEffect, useMemo, useState } from "react";
import { BigNumber, ethers } from "ethers";
import JSONPretty from "react-json-pretty";

import { useEthersHook } from "../../hooks/use-ethers.hook";
import { useWalletContext } from "../../components/Wallet/WalletContext";

type DataType = {
  didControllers?: string[];
  versionHashes?: string[];
  metadata?: string[];
  timestampIds?: string[];
  administrators?: string[];
  versionInfos?: string[];
  metadataVersionIds?: string[];
  timestampsIds?: string[];
}[];

type PropType = {
  didRecord: any;
};

type PaginatedResponse = {
  howMany: BigNumber;
  items: string[];
};

export default function useDidTable({ didRecord }: PropType) {
  const { didRegistryContract } = useEthersHook();
  const { registryContract } = useEthersHook();
  const { walletAddress } = useWalletContext();
  const [didControllers, setDidControllers] = useState<string[]>([]);
  const [versionHashes, setVersionHashes] = useState<string[]>([]);
  const [versionInfos, setVersionInfos] = useState<string[]>([]);
  const [metadataVersionIds, setMetadataVersionIds] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<string[]>([]);
  const [timestampsIds, setTimestampsIds] = useState<string[]>([]);
  const [administrators, setAdministrators] = useState<string[]>([]);

  useEffect(() => {
    if (!didRegistryContract || !versionHashes.length) {
      return;
    }
    const didEbsi = `did:ebsi:${walletAddress}`;
    const promises = versionHashes.map(() => {
      return didRegistryContract
        .getDidDocumentVersionDidTimestampIds(
          `0x${Buffer.from(didEbsi).toString("hex")}`,
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
    versionHashes,
    versionHashes.length,
    walletAddress,
  ]);

  useEffect(() => {
    if (didRecord.controllerIds) {
      setDidControllers(didRecord.controllerIds);
    }
  }, [didRecord.controllerIds]);

  useEffect(() => {
    if (!didRegistryContract || !versionHashes.length) {
      return;
    }
    const didEbsi = `did:ebsi:${walletAddress}`;
    didRegistryContract
      .getDidDocumentVersionMetadataIds(
        `0x${Buffer.from(didEbsi).toString("hex")}`,
        versionHashes[0],
        1,
        50
      )
      .then((data: any) => {
        setMetadataVersionIds(data.items);
      })
      .catch(() => {});
  }, [didRecord, didRegistryContract, versionHashes, walletAddress]);

  useEffect(() => {
    if (!didRegistryContract || !metadataVersionIds.length) {
      return;
    }
    const promises = metadataVersionIds.map((versionIdData: string) => {
      return didRegistryContract.getDidDocumentVersionMetadata(versionIdData);
    });
    Promise.all(promises).then((data) => {
      setMetadata(data);
    });
  }, [didRegistryContract, metadataVersionIds]);

  useEffect(() => {
    if (!didRegistryContract || !didRecord || !didRecord[0]) {
      return;
    }
    const didEbsi = `did:ebsi:${walletAddress}`;
    didRegistryContract
      .getDidDocumentVersionIds(
        `0x${Buffer.from(didEbsi).toString("hex")}`,
        1,
        50
      )
      .then((didVersionIds: PaginatedResponse) => {
        setVersionHashes(didVersionIds.items);
      });
    setVersionHashes([]);
  }, [didRecord, didRegistryContract, walletAddress]);

  useEffect(() => {
    if (!didRegistryContract || !didRecord || !didRecord[0]) {
      return;
    }
    let promises = [];
    if (versionHashes.length) {
      promises = versionHashes.map((hash: string) =>
        didRegistryContract.getDidDocumentVersionInfo(hash)
      );
      Promise.all(promises).then((versionInfosTemp: string[]) => {
        setVersionInfos(versionInfosTemp);
      });
    }
  }, [didRecord, didRegistryContract, versionHashes]);

  useEffect(() => {
    if (!registryContract || !walletAddress) {
      return;
    }
    registryContract
      .getAdministrator(`did:ebsi:${walletAddress}`)
      .then((administratorsData: string[]) => {
        setAdministrators(administratorsData);
      })
      .catch(() => {});
  }, [registryContract, walletAddress]);

  const dataSource: DataType = useMemo(() => {
    return [
      {
        didControllers,
        versionHashes,
        versionInfos,
        metadataVersionIds,
        metadata,
        timestampsIds,
        administrators,
      },
    ];
  }, [
    didControllers,
    metadata,
    metadataVersionIds,
    versionHashes,
    versionInfos,
    timestampsIds,
    administrators,
  ]);

  const columns = [
    {
      title: "Did controller(s)",
      dataIndex: "didControllers",
      key: "didControllers",
      render: (values: string[]) => {
        if (values) {
          return (
            <>
              {values.map((value) => (
                <p key={value}>{value}</p>
              ))}
            </>
          );
        }
        return <></>;
      },
    },
    {
      title: "Version hashes",
      key: "versionHashes",
      render: ({
        versionHashes: versionHashesData,
        versionInfos: versionInfosData,
      }: any) => {
        return (
          <>
            {versionHashesData ? (
              <>
                <h3>Version Hash</h3>
                {versionHashesData.map((versionHash: any) => (
                  <p key={versionHash}>{versionHash}</p>
                ))}
              </>
            ) : (
              ""
            )}
            {versionInfosData ? (
              <>
                <h3>Version Info data</h3>
                {versionInfosData.map((versionInfoData: any) => (
                  <p key={versionInfoData}>
                    <JSONPretty
                      id="json-pretty"
                      data={ethers.utils.toUtf8String(versionInfoData)}
                    />
                  </p>
                ))}
              </>
            ) : (
              ""
            )}
          </>
        );
      },
    },
    {
      title: "Metadata",
      key: "metadata",
      render: ({
        metadataVersionIds: metadataVersionIdsData,
        metadata: metadataRow,
      }: any) => {
        return (
          <>
            {metadataVersionIdsData ? (
              <>
                <h3>Metadata Version Ids</h3>
                {metadataVersionIdsData.map((versionHash: string) => (
                  <p key={versionHash}>{versionHash}</p>
                ))}
              </>
            ) : (
              ""
            )}
            {metadataVersionIdsData ? (
              <>
                <h3>Metadata</h3>
                {metadataRow.map((metadataItem: string) => (
                  <p key={metadataItem}>
                    <JSONPretty
                      id="json-pretty"
                      data={ethers.utils.toUtf8String(metadataItem)}
                    />
                  </p>
                ))}
              </>
            ) : (
              ""
            )}
          </>
        );
      },
    },
    {
      title: "Timestamp Ids",
      key: "timestampIds",
      render: ({ timestampsIds: timestampsIdsData }: any) => {
        return (
          <>
            {timestampsIdsData ? (
              <>
                {timestampsIdsData.map((timestampId: string) => (
                  <p key={timestampId}>{timestampId}</p>
                ))}
              </>
            ) : (
              ""
            )}
          </>
        );
      },
    },
    {
      title: "Administrators",
      key: "administrators",
      render: ({ administrators: administratorsData }: any) => {
        return (
          <>
            {administratorsData.length ? (
              <>
                {administratorsData.map((administrator: string) => (
                  <p key={administrator}>{administrator}</p>
                ))}
              </>
            ) : (
              ""
            )}
          </>
        );
      },
    },
  ];

  return {
    columns,
    dataSource,
  };
}
