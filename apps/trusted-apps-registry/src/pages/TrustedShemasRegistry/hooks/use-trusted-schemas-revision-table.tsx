import React, { useCallback, useEffect, useState } from "react";
import { Button } from "antd";
import { useHistory, useParams } from "react-router-dom";
import { EyeOutlined } from "@ant-design/icons";
import { DEFAULT_PAGE, PAGE_SIZE } from "../constants";
import useTrustedSchemasRevision from "./use-trusted-schemas-revision";
import { config } from "../../../config";

type TableDataType = {
  id: string;
};

export default function useTrustedSchemasRevisionTable() {
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [dataSource, setDataSource] = useState<TableDataType[]>([]);

  const { schemaId }: { schemaId: string } = useParams();
  const { loadData, hasErrorLoadingData, loadSchemaRevisionById } =
    useTrustedSchemasRevision();
  const { push } = useHistory();

  const loadTableData = useCallback(async () => {
    if (schemaId) {
      setLoading(true);
      try {
        const data: { items: TableDataType[]; total: number } = await loadData(
          schemaId,
          page,
          PAGE_SIZE
        );
        if (data) {
          setDataSource(data.items);
          setTotalItems(data.total);
        }
        setLoading(false);
      } catch (ex) {
        setLoading(false);
      }
    }
  }, [loadData, page, schemaId]);

  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  const columns = [
    {
      title: "Revisions IDs",
      key: "id",
      dataIndex: "id",
    },
    {
      title: "Revision schema",
      key: "revision",
      render: ({ id }: { id: string }) => {
        return (
          <Button
            onClick={() => {
              loadSchemaRevisionById(id);
            }}
          >
            <EyeOutlined />
            Show revision schema ID
          </Button>
        );
      },
    },
    {
      title: "Metadata",
      render: ({ id: idMetadata }: { id: string }) => {
        return (
          <Button
            onClick={() => {
              push(
                config.routes.trustedSchemaRegistryRevisionMetadata.replace(
                  ":revisionId",
                  idMetadata
                )
              );
            }}
          >
            Show metadata
          </Button>
        );
      },
    },
  ];

  return {
    columns,
    loading,
    setLoading,
    totalItems,
    setTotalItems,
    page,
    setPage,
    dataSource,
    setDataSource,
    hasErrorLoadingData,
    loadTableData,
  };
}
