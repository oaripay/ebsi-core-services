import React, { useCallback, useEffect, useState } from "react";
import Paragraph from "antd/es/typography/Paragraph";
import { Button, Collapse, Row, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";

import { ethers } from "ethers";
import { useEthersHook } from "../../../hooks/use-ethers.hook";
import { DEFAULT_PAGE, PAGE_SIZE } from "../constants";
import { PaginatedResponseType } from "../../../shared/PaginatedResponseType";

const { Panel } = Collapse;

type TrustedIssuerDataType = {
  did: string;
  attributeData: string[];
  revisions: string[];
};

export default function useTrustedIssuersTable(options: {
  setAttributeHashModal: (options: { show: boolean; did: string }) => void;
  setRevisionModal: (options: {
    show: boolean;
    did: string;
    attributes: string[];
  }) => void;
}) {
  const [dataSource, setDataSource] = useState<TrustedIssuerDataType[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [tableLoading, setTableLoading] = useState(true);
  const { trustedIssuersContract } = useEthersHook();

  const loadTableData = useCallback(async () => {
    if (!trustedIssuersContract) {
      return;
    }
    setTableLoading(true);
    const paginatedResponseData = await trustedIssuersContract
      .getIssuers(page, PAGE_SIZE)
      .catch(() => {});

    setTotalItems(paginatedResponseData.total.toNumber());

    const issuersAttributesPromises = paginatedResponseData.items.map(
      (item: string) => {
        return trustedIssuersContract.getIssuer(item);
      }
    );

    const attributesMatrix = await Promise.all(issuersAttributesPromises);
    const revisionsPromises = attributesMatrix.map((attributes: any) => {
      return Promise.all(
        attributes.map((attr: string) => {
          return trustedIssuersContract
            .getIssuerAttributeRevisions(attr, DEFAULT_PAGE, PAGE_SIZE)
            .then(async (result: PaginatedResponseType) => {
              const awaitResult = await Promise.all(
                result.items.map((resultItem: any) => {
                  return trustedIssuersContract.getIssuerAttributeByHash(
                    resultItem
                  );
                })
              );
              return awaitResult.map((item: { attribData: string }) =>
                ethers.utils.toUtf8String(item.attribData)
              );
            });
        })
      );
    });

    const revisions = await Promise.all(revisionsPromises);
    const source: TrustedIssuerDataType[] = paginatedResponseData.items.map(
      (item: string, index: number) => {
        return {
          did: item,
          attributeData: attributesMatrix[index],
          revisions: revisions[index],
        };
      }
    );

    setDataSource(source);
    setTableLoading(false);
  }, [page, trustedIssuersContract]);

  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  const columns = [
    {
      title: "Issuer DID",
      key: "did",
      dataIndex: "did",
    },
    {
      title: "Attribute(s) data",
      key: "attributeData",
      render: ({
        attributeData,
        revisions,
        did,
      }: {
        did: string;
        attributeData: string[];
        revisions: string[][];
      }) => {
        if (!attributeData || !attributeData.length) {
          return <></>;
        }
        return (
          <Space direction="vertical">
            <Collapse defaultActiveKey={["1"]}>
              {attributeData.map((attr: string, index: number) => {
                return (
                  <React.Fragment key={`${attr + Math.random()}`}>
                    <Panel header={attr} key={attr}>
                      <h3>Revisions</h3>
                      {revisions[index]?.map((revision) => {
                        return (
                          <Paragraph
                            copyable={{ text: attr }}
                            key={`${revision + Math.random()}`}
                          >
                            {revision}
                          </Paragraph>
                        );
                      })}
                    </Panel>
                  </React.Fragment>
                );
              })}
            </Collapse>
            <Row>
              <Space>
                <Button
                  type="primary"
                  onClick={() => {
                    options.setAttributeHashModal({
                      show: true,
                      did,
                    });
                  }}
                >
                  <PlusOutlined />
                  Add new attribute hash
                </Button>
                <Button
                  type="primary"
                  onClick={() => {
                    options.setRevisionModal({
                      show: true,
                      did,
                      attributes: attributeData,
                    });
                  }}
                >
                  <PlusOutlined />
                  Add new revision
                </Button>
              </Space>
            </Row>
          </Space>
        );
      },
    },
  ];

  return {
    columns,
    dataSource,
    tableLoading,
    loadTableData,
    totalItems,
    setPage,
    page,
  };
}
