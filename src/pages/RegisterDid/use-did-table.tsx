import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BigNumber, ethers } from "ethers";
import JSONPretty from "react-json-pretty";

import Paragraph from "antd/es/typography/Paragraph";
import { Button, Form, Tooltip, Row, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";

import { useEthersHook } from "../../hooks/use-ethers.hook";
import { useWalletContext } from "../../components/Wallet/WalletContext";
import DidControllerModalContent from "./DidControllerModalContent";
import useDidControllerModal from "./use-did-controller-modal";

type ModalPropsType = {
  visible: boolean;
  content: ReactElement;
  title: string;
  width: number;
  onOk?: (param?: any) => void;
};

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
  const [modal, setModal] = useState<ModalPropsType>({
    visible: false,
    content: <></>,
    title: "",
    width: 700,
  });
  const [didControllers, setDidControllers] = useState<string[]>([]);
  const [versionHashes, setVersionHashes] = useState<string[]>([]);
  const [versionInfos, setVersionInfos] = useState<string[]>([]);
  const [metadataVersionIds, setMetadataVersionIds] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<string[]>([]);
  const [timestampsIds, setTimestampsIds] = useState<string[]>([]);
  const [administrators, setAdministrators] = useState<string[]>([]);
  const [insertDidControllerForm] = Form.useForm();
  const [updateDidControllerForm] = Form.useForm();
  const [tableLoading] = useState(false);

  const { insertDidController, updateDidController } = useDidControllerModal({
    insertDidControllerForm,
    updateDidControllerForm,
  });

  const identifier = useMemo(() => {
    if (!walletAddress) {
      return "";
    }
    return `did:ebsi:${walletAddress}`;
  }, [walletAddress]);

  const resetModal = useCallback(() => {
    setModal({
      content: <></>,
      title: "",
      visible: false,
      width: 700,
      onOk: undefined,
    });
  }, []);

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
  }, [didRegistryContract, metadataVersionIds]);

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
  }, [didRecord, didRegistryContract, identifier, walletAddress]);

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
  }, [didRecord, didRegistryContract, versionHashes]);

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
  }, [identifier, registryContract, walletAddress]);

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
                <Tooltip title={value} key={value}>
                  <Paragraph
                    className="d-flex"
                    key={value}
                    copyable={{
                      text: value,
                    }}
                  >
                    {value.slice(0, 4)}...
                    {value.slice(-4)}
                  </Paragraph>
                </Tooltip>
              ))}
              <Space direction="vertical">
                <Row>
                  <Button
                    onClick={() => {
                      setModal({
                        visible: true,
                        title: "Insert DID Controller",
                        onOk: () => {
                          insertDidController(identifier)?.then(() => {
                            resetModal();
                          });
                        },
                        content: (
                          <DidControllerModalContent
                            form={insertDidControllerForm}
                          />
                        ),
                        width: 500,
                      });
                    }}
                  >
                    <PlusOutlined />
                    Insert DID Controller
                  </Button>
                </Row>
                <Row>
                  <Button
                    onClick={() => {
                      setModal({
                        visible: true,
                        title: "Update DID Controller",
                        onOk: () => {
                          updateDidController(identifier)?.then(() => {
                            resetModal();
                          });
                        },
                        content: (
                          <DidControllerModalContent
                            form={updateDidControllerForm}
                          />
                        ),
                        width: 500,
                      });
                    }}
                  >
                    <PlusOutlined />
                    Update DID Controller
                  </Button>
                </Row>
              </Space>
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
          <div>
            {versionHashesData ? (
              <>
                <h3>Version Hash</h3>
                {versionHashesData.map((versionHash: string) => (
                  <Tooltip title={versionHash} key={versionHash}>
                    <Paragraph
                      key={versionHash}
                      copyable={{
                        text: versionHash,
                      }}
                    >
                      {versionHash.slice(0, 4)}...
                      {versionHash.slice(-4)}
                    </Paragraph>
                  </Tooltip>
                ))}
              </>
            ) : (
              ""
            )}
            {versionInfosData ? (
              <>
                <h3>Version Info data</h3>
                <Button
                  onClick={() => {
                    setModal({
                      visible: true,
                      width: 850,
                      title: "Version info data",
                      content: versionInfosData.map((versionInfoData: any) => (
                        <div key={versionInfoData}>
                          <Paragraph
                            copyable={{
                              text: ethers.utils.toUtf8String(versionInfoData),
                            }}
                          >
                            Copy JSON
                          </Paragraph>
                          <JSONPretty
                            id="json-pretty"
                            data={ethers.utils.toUtf8String(versionInfoData)}
                          />
                        </div>
                      )),
                    });
                  }}
                >
                  Show metadata
                </Button>
              </>
            ) : (
              ""
            )}
          </div>
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
          <div>
            {metadataVersionIdsData ? (
              <>
                <h3>Metadata Version Ids</h3>
                {metadataVersionIdsData.map((versionHash: string) => (
                  <Tooltip title={versionHash} key={versionHash}>
                    <Paragraph
                      key={versionHash}
                      copyable={{
                        text: versionHash,
                      }}
                    >
                      {versionHash.slice(0, 4)}...
                      {versionHash.slice(-4)}
                    </Paragraph>
                  </Tooltip>
                ))}
              </>
            ) : (
              ""
            )}
            {metadataVersionIdsData ? (
              <>
                <h3>Metadata</h3>
                <Button
                  onClick={() => {
                    setModal({
                      visible: true,
                      width: 700,
                      title: "Metadata",
                      content: metadataRow.map((metadataItem: string) => (
                        <div key={metadataItem}>
                          <JSONPretty
                            id="json-pretty"
                            data={ethers.utils.toUtf8String(metadataItem)}
                          />
                        </div>
                      )),
                    });
                  }}
                >
                  Show metadata
                </Button>
              </>
            ) : (
              ""
            )}
          </div>
        );
      },
    },
    {
      title: "Timestamp Ids",
      key: "timestampIds",
      render: ({ timestampsIds: timestampsIdsData }: any) => {
        return (
          <>
            {timestampsIdsData.length ? (
              <>
                {timestampsIdsData.map((timestampId: string) => {
                  return (
                    <Tooltip title={timestampId} key={timestampId}>
                      <Paragraph
                        className="d-flex"
                        key={timestampId}
                        copyable={{
                          text: timestampId,
                        }}
                      >
                        {timestampId[0].slice(0, 4)}...
                        {timestampId[0].slice(-4)}
                      </Paragraph>
                    </Tooltip>
                  );
                })}
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
                  <Tooltip title={administrator} key={administrator}>
                    <Paragraph
                      className="d-flex"
                      key={administrator}
                      copyable={{
                        text: administrator,
                      }}
                    >
                      {administrator.slice(0, 4)}...
                      {administrator.slice(-4)}
                    </Paragraph>
                  </Tooltip>
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
    modal,
    setModal,
    resetModal,
    tableLoading,
  };
}
