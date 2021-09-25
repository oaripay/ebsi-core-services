import React, { useCallback, useMemo, useState } from "react";
import { ethers } from "ethers";
import JSONPretty from "react-json-pretty";

import Paragraph from "antd/es/typography/Paragraph";
import { Button, Form, Tooltip, Row, Space } from "antd";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";

import { useWalletContext } from "../../components/Wallet/WalletContext";
import DidControllerModalContent from "./DidControllerModalContent";
import useDidControllerModal from "./use-did-controller-modal";
import AdministratorControllerModalContent from "./AdministratorControllerModalContent";
import { DataType, ModalPropsType, PropType } from "./DidTableTypes";
import { useDidTableEffects } from "./use-did-table-effects";
import DidDocumentModalContent from "./DidDocumentModalContent";
import { getIdentifierFromWalletAddr } from "./DidUtils";
import AdministratorUpdateControllerModalContent from "./AdministratorUpdateControllerModalContent";

export default function useDidTable({ didRecord }: PropType) {
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
  const [administratorLastHash, setAdministratorLastHash] = useState<string[]>(
    []
  );
  const [didRecordsIdsByController, setDidRecordsIds] = useState<string[]>([]);
  const [insertDidControllerForm] = Form.useForm();
  const [updateDidControllerForm] = Form.useForm();
  const [insertAdminForm] = Form.useForm();
  const [updateAdminForm] = Form.useForm();
  const [appendDidDocumentVersionHashForm] = Form.useForm();
  const [tableLoading] = useState(false);

  const identifier = useMemo(() => {
    if (!walletAddress) {
      return "";
    }
    return getIdentifierFromWalletAddr(walletAddress);
  }, [walletAddress]);

  useDidTableEffects({
    setDidControllers,
    setVersionHashes,
    setVersionInfos,
    setMetadataVersionIds,
    setMetadata,
    setAdministratorLastHash,
    setTimestampsIds,
    didRecord,
    identifier,
    versionHashes,
    walletAddress,
    metadataVersionIds,
    setDidRecordsIds,
    didControllers,
  });

  const {
    insertDidController,
    updateDidController,
    insertAdministrator,
    updateAdministrator,
    appendDidDocumentVersionHash,
  } = useDidControllerModal({
    insertDidControllerForm,
    updateDidControllerForm,
    insertAdminForm,
    updateAdminForm,
    appendDidDocumentVersionHashForm,
  });

  const resetModal = useCallback(() => {
    setModal({
      content: <></>,
      title: "",
      visible: false,
      width: 700,
      onOk: undefined,
    });
  }, []);

  const dataSource: DataType = useMemo(() => {
    return [
      {
        did: getIdentifierFromWalletAddr(walletAddress),
        didControllers,
        versionHashes,
        versionInfos,
        metadataVersionIds,
        metadata,
        timestampsIds,
        administratorLastHash,
        didRecordsIdsByController,
      },
    ];
  }, [
    walletAddress,
    didControllers,
    versionHashes,
    versionInfos,
    metadataVersionIds,
    metadata,
    timestampsIds,
    administratorLastHash,
    didRecordsIdsByController,
  ]);

  const columns = [
    {
      title: "DID",
      key: "did",
      render: ({ did }: { did: string }) => {
        if (!did) {
          return <></>;
        }
        return (
          <Tooltip title={did}>
            <Paragraph
              className="d-flex"
              copyable={{
                text: did,
              }}
            >
              {did.slice(0, 4)}...
              {did.slice(-4)}
            </Paragraph>
          </Tooltip>
        );
      },
    },
    {
      title: "Did controller(s)",
      key: "didControllers",
      render: ({
        didControllers: didControllersData,
        didRecordsIdsByController: didRecordsControllersData,
      }: {
        didControllers: string[];
        didRecordsIdsByController: string[];
      }) => {
        return (
          <Space direction="vertical">
            {didRecordsControllersData ? (
              <>
                <h3>My controller DIDs</h3>
                {didRecordsControllersData.map((didRecordItem) => {
                  return (
                    <Tooltip
                      title={didRecordItem}
                      key={`${didRecordItem}-${Math.random()}`}
                    >
                      <Paragraph
                        className="d-flex"
                        key={didRecordItem}
                        copyable={{
                          text: didRecordItem,
                        }}
                      >
                        {didRecordItem.slice(0, 4)}...
                        {didRecordItem.slice(-4)}
                      </Paragraph>
                    </Tooltip>
                  );
                })}
              </>
            ) : (
              <></>
            )}
            {didControllersData ? (
              <>
                <h3>My DID record</h3>
                {didControllersData.map((value) => (
                  <React.Fragment key={`${value}-${Math.random()}`}>
                    <Row align="middle">
                      <Tooltip title={value} key={`${value}-${Math.random()}`}>
                        <Paragraph
                          className="d-flex m-b-0"
                          key={value}
                          copyable={{
                            text: value,
                          }}
                        >
                          {value.slice(0, 4)}...
                          {value.slice(-4)}
                        </Paragraph>
                      </Tooltip>
                      <Button
                        type="link"
                        className="m-l-4 p-0"
                        onClick={() => {
                          setModal({
                            visible: true,
                            title: "Update DID Controller",
                            onOk: () => {
                              updateDidController(
                                getIdentifierFromWalletAddr(value)
                              )?.then(() => {
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
                        <EditOutlined />
                      </Button>
                    </Row>
                  </React.Fragment>
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
                </Space>
              </>
            ) : (
              <></>
            )}
          </Space>
        );
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
          <Space direction="vertical">
            {versionHashesData ? (
              <>
                <h3>Version Hash</h3>
                {versionHashesData.map((versionHash: string, index: number) => (
                  <Tooltip title={versionHash} key={`${versionHash + index}`}>
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
            <Button
              onClick={() => {
                setModal({
                  visible: true,
                  width: 600,
                  title: "Append DID document version hash",
                  onOk: () => {
                    appendDidDocumentVersionHash()?.then(() => {
                      resetModal();
                    });
                  },
                  content: (
                    <DidDocumentModalContent
                      form={appendDidDocumentVersionHashForm}
                    />
                  ),
                });
              }}
            >
              Append DID document version hash
            </Button>
            <Button
              onClick={() => {
                setModal({
                  visible: true,
                  width: 700,
                  title: "Detach DID document version hash",
                  content: <h1>vasile</h1>,
                });
              }}
            >
              Detach DID document version hash
            </Button>
            {versionInfosData ? (
              <>
                <h3>Version Info data</h3>
                <Button
                  onClick={() => {
                    setModal({
                      visible: true,
                      width: 850,
                      title: "Version info data",
                      content: versionInfosData.map(
                        (versionInfoData: string, index: number) => (
                          <div key={`${versionInfoData + index}`}>
                            <Paragraph
                              copyable={{
                                text: ethers.utils.toUtf8String(
                                  versionInfoData
                                ),
                              }}
                            >
                              Copy JSON
                            </Paragraph>
                            <JSONPretty
                              id="json-pretty"
                              data={ethers.utils.toUtf8String(versionInfoData)}
                            />
                          </div>
                        )
                      ),
                    });
                  }}
                >
                  Show version info metadata
                </Button>
              </>
            ) : (
              ""
            )}
          </Space>
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
                {metadataVersionIdsData.map(
                  (versionHash: string, index: number) => (
                    <Tooltip title={versionHash} key={`${versionHash + index}`}>
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
                  )
                )}
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
                {timestampsIdsData.map((timestampId: string, index: number) => {
                  return (
                    <Tooltip title={timestampId} key={`${timestampId + index}`}>
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
      title: "Administrator attributes last hash",
      key: "administratorLastHash",
      render: ({ administratorLastHash: administratorsData }: any) => {
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
            <Space direction="vertical">
              <Row>
                <Button
                  onClick={() => {
                    setModal({
                      visible: true,
                      title: "Insert Admin",
                      onOk: () => {
                        insertAdministrator()?.then(() => {
                          resetModal();
                        });
                      },
                      content: (
                        <AdministratorControllerModalContent
                          form={insertAdminForm}
                        />
                      ),
                      width: 500,
                    });
                  }}
                >
                  <PlusOutlined />
                  Insert Admin
                </Button>
              </Row>
              <Row>
                <Button
                  onClick={() => {
                    setModal({
                      visible: true,
                      title: "Update Admin",
                      onOk: () => {
                        updateAdministrator()?.then(() => {
                          resetModal();
                        });
                      },
                      content: (
                        <AdministratorUpdateControllerModalContent
                          form={updateAdminForm}
                          walletAddress={walletAddress}
                        />
                      ),
                      width: 500,
                    });
                  }}
                >
                  <EditOutlined />
                  Update Admin attributes
                </Button>
              </Row>
            </Space>
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
