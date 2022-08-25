import React, { useCallback, useEffect, useState } from "react";
import { Button, Tooltip } from "antd";
import { useNavigate } from "react-router-dom";
import { EyeOutlined } from "@ant-design/icons";
import useTrustedSchemasRegistry from "./use-trusted-schemas-registry";
import { PAGE_SIZE, DEFAULT_PAGE } from "../constants";
import { config } from "../../../config";

type TableDataType = {
  id: string;
  latestSchemaRevisionId: string;
};

export default function useTrustedSchemasRegistryTable() {
  const { loadData, showLatestSchemaRevision } = useTrustedSchemasRegistry();

  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [dataSource, setDataSource] = useState<TableDataType[]>([]);
  const navigate = useNavigate();

  const columns = [
    {
      title: "Schema ID",
      key: "id",
      dataIndex: "id",
    },
    {
      title: "Latest schema revision",
      key: "latestSchemaRevisionId",
      render: ({ id }: { id: string }) => {
        return (
          <Tooltip title="Show latest schema revision">
            <Button
              onClick={() => {
                showLatestSchemaRevision(id);
              }}
            >
              <EyeOutlined />
              Show schema
            </Button>
          </Tooltip>
        );
      },
    },
    {
      title: "Actions",
      key: "otherSchemaRevisionIds",
      render: ({ id }: { id: string }) => (
        <Button
          onClick={() =>
            navigate(
              config.routes.trustedSchemaRegistryRevision.replace(
                ":schemaId",
                id
              )
            )
          }
        >
          Show all revisions
        </Button>
      ),
    },
  ];

  const loadTableData = useCallback(async () => {
    setLoading(true);
    try {
      const data: { items: TableDataType[]; total: number } = await loadData(
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
  }, [loadData, page]);

  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  return {
    columns,
    totalItems,
    page,
    setPage,
    dataSource,
    loading,
    loadTableData,
  };
}
