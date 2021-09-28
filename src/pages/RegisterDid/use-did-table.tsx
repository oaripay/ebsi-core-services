import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import JSONPretty from "react-json-pretty";

import Paragraph from "antd/es/typography/Paragraph";
import { Button, Form, Tooltip, Row, Space, notification } from "antd";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";

import { useWalletContext } from "../../components/Wallet/WalletContext";
import DidControllerModalContent from "./DidControllerModalContent";
import useDidControllerModal from "./use-did-controller-modal";
import AdministratorControllerModalContent from "./AdministratorControllerModalContent";
import { DataType, ModalPropsType, PaginatedResponse } from "./DidTableTypes";
import AppendDidDocumentHashModalContent from "./AppendDidDocumentHashModalContent";
import { getIdentifierFromWalletAddr } from "./DidUtils";
import AdministratorUpdateControllerModalContent from "./AdministratorUpdateControllerModalContent";
import DetachDidDocumentVersionHashContent from "./DetachDidDocumentVersionHashContent";
import { useRegisterDidContext } from "./RegisterDid.context";
import s from "./style.module.css";
import useDidRegister from "./use-did-register";

export enum SourceType {
  MY_DID_RECORD = "MY_DID_RECORD",
  MY_CONTROLLER_DIDS = "MY_CONTROLLER_DIDS",
}

const LS_DIDS_KEY = "EBSI_DIDS";

export default function useDidTable() {
  const { walletAddress } = useWalletContext();
  const [modal, setModal] = useState<ModalPropsType>({
    visible: false,
    content: <></>,
    title: "",
    width: 700,
  });
  const [dataSource, setDataSource] = useState<DataType[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [sourceType, setSourceType] = useState<string>(
    SourceType.MY_DID_RECORD
  );
  const [insertDidControllerForm] = Form.useForm();
  const [updateDidControllerForm] = Form.useForm();
  const [insertAdminForm] = Form.useForm();
  const [updateAdminForm] = Form.useForm();
  const [appendDidDocumentVersionHashForm] = Form.useForm();
  const [detachDidDocumentVersionHashForm] = Form.useForm();
  const { loadTableData, getDidRecordIdentifiersByControllerId } =
    useDidRegister();

  const [didToBeLoaded, setDidToBeLoaded] = useState("");

  const updateDidsFromLs = useCallback((did: string) => {
    const itemsStringified = localStorage.getItem(LS_DIDS_KEY);
    try {
      const itemsParsed = JSON.parse(itemsStringified || "[]");
      if (!itemsParsed.includes(did)) {
        localStorage.setItem(
          LS_DIDS_KEY,
          JSON.stringify([...itemsParsed, did])
        );
      }
    } catch (ex) {
      //
    }
  }, []);

  const getDidsFromLs = useCallback(() => {
    try {
      const itemsStringified = localStorage.getItem(LS_DIDS_KEY);
      if (itemsStringified) {
        return JSON.parse(itemsStringified);
      }
      return [];
    } catch (ex) {
      return [];
    }
  }, []);

  const loadDid = useCallback(() => {
    if (didToBeLoaded) {
      const foundItem = dataSource.find((item) => item.did === didToBeLoaded);
      if (!foundItem) {
        setTableLoading(true);
        loadTableData(didToBeLoaded).then((data: DataType | undefined) => {
          if (data) {
            updateDidsFromLs(didToBeLoaded);
            setDataSource((current) => [data, ...current]);
          }
          setTableLoading(false);
        });
        return;
      }
      notification.warn({
        message: "Cannot load DID",
        description: "DID already exists!",
      });
    }
  }, [dataSource, didToBeLoaded, loadTableData, updateDidsFromLs]);

  const initTable = useCallback(() => {
    if (walletAddress) {
      setTableLoading(true);

      if (sourceType === SourceType.MY_DID_RECORD) {
        loadTableData(getIdentifierFromWalletAddr(walletAddress)).then(
          (data: DataType | undefined) => {
            if (data) {
              setDataSource([data]);
            }
            setTableLoading(false);
          }
        );
      }
      if (sourceType === SourceType.MY_CONTROLLER_DIDS) {
        getDidRecordIdentifiersByControllerId(walletAddress).then(
          (didResponse: PaginatedResponse) => {
            const allDids = [
              ...getDidsFromLs(),
              ...didResponse.items.map((item) =>
                ethers.utils.toUtf8String(item)
              ),
            ];

            Promise.all(allDids.map((didItem) => loadTableData(didItem))).then(
              (data: any) => {
                if (data && data.length) {
                  setDataSource(data);
                }
                setTableLoading(false);
              }
            );
          }
        );
      }
    }
  }, [
    getDidRecordIdentifiersByControllerId,
    getDidsFromLs,
    loadTableData,
    sourceType,
    walletAddress,
  ]);

  const removeDidsFromLs = useCallback(() => {
    localStorage.removeItem(LS_DIDS_KEY);
    initTable();
  }, [initTable]);

  useEffect(() => {
    initTable();
  }, [initTable]);

  const identifier = useMemo(() => {
    if (!walletAddress) {
      return "";
    }
    return getIdentifierFromWalletAddr(walletAddress);
  }, [walletAddress]);

  const { didAsAdministrator } = useRegisterDidContext();

  const resetModal = useCallback(() => {
    setModal({
      content: <></>,
      title: "",
      visible: false,
      width: 700,
      onOk: undefined,
    });
  }, []);

  const {
    insertDidController,
    updateDidController,
    insertAdministrator,
    updateAdministrator,
    appendDidDocumentVersionHash,
    detachDidDocumentVersionHash,
  } = useDidControllerModal({
    insertDidControllerForm,
    updateDidControllerForm,
    insertAdminForm,
    updateAdminForm,
    appendDidDocumentVersionHashForm,
    detachDidDocumentVersionHashForm,
    resetModal,
  });

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
      render: ({ didControllers }: { didControllers: string[] }) => {
        return (
          <Space direction="vertical">
            {didControllers ? (
              <>
                {didControllers.map((value) => (
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
                                initTable();
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
                              initTable();
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
      render: ({ versionHashes, versionInfos }: any) => {
        return (
          <Space direction="vertical">
            {versionHashes ? (
              <>
                <h3>Version Hash</h3>
                {versionHashes.map((versionHash: string, index: number) => (
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
              disabled
              onClick={() => {
                setModal({
                  visible: true,
                  width: 600,
                  title: "Append DID document version hash",
                  onOk: () => {
                    appendDidDocumentVersionHash()?.then(() => {
                      initTable();
                    });
                  },
                  content: (
                    <AppendDidDocumentHashModalContent
                      form={appendDidDocumentVersionHashForm}
                    />
                  ),
                });
              }}
            >
              Append DID document version hash
            </Button>
            <Button
              disabled
              onClick={() => {
                setModal({
                  visible: true,
                  width: 600,
                  title: "Append DID document version hash",
                  onOk: () => {
                    detachDidDocumentVersionHash()?.then(() => {
                      initTable();
                    });
                  },
                  content: (
                    <DetachDidDocumentVersionHashContent
                      form={detachDidDocumentVersionHashForm}
                      versionHashes={versionHashes}
                    />
                  ),
                });
              }}
            >
              Detach DID document version hash
            </Button>
            {versionInfos ? (
              <>
                <h3>Version Info data</h3>
                <Button
                  onClick={() => {
                    setModal({
                      visible: true,
                      width: 850,
                      title: "Version info data",
                      content: (
                        <div className={s.scrollableList}>
                          {versionInfos.map(
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
                                  data={ethers.utils.toUtf8String(
                                    versionInfoData
                                  )}
                                />
                              </div>
                            )
                          )}
                        </div>
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
      render: ({ metadataVersionIds, metadata }: any) => {
        return (
          <div>
            {metadataVersionIds ? (
              <>
                <h3>Metadata Version Ids</h3>
                {metadataVersionIds.map(
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
            {metadataVersionIds ? (
              <>
                <h3>Metadata</h3>
                <Button
                  onClick={() => {
                    setModal({
                      visible: true,
                      width: 700,
                      title: "Metadata",
                      content: metadata.map((metadataItem: string) => (
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
      key: "timestampsIds",
      render: ({ timestampsIds }: any) => {
        return (
          <>
            {timestampsIds.length ? (
              <>
                {timestampsIds.map((timestampId: string, index: number) => {
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
      render: ({ administratorLastHash }: any) => {
        return (
          <>
            {administratorLastHash.length ? (
              <>
                {administratorLastHash.map((administrator: string) => (
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
                  disabled={didAsAdministrator}
                  onClick={() => {
                    setModal({
                      visible: true,
                      title: "Insert Admin",
                      onOk: () => {
                        insertAdministrator()?.then(() => {
                          initTable();
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
                          initTable();
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
    setSourceType,
    loadDid,
    setDidToBeLoaded,
    removeDidsFromLs,
  };
}
