import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { DEFAULT_PAGE } from "../constants";
import useTrustedSchemasMetadata from "./use-trusted-schemas-metadata";

type TableDataType = {
  id: string;
};

export default function useTrustedSchemasMetadataTable() {
  const { loadData, hasErrorLoadingData, showMetadataSchema } =
    useTrustedSchemasMetadata();

  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [dataSource, setDataSource] = useState<TableDataType[]>([]);

  const columns = [
    {
      title: "Metadata ID",
      key: "id",
      dataIndex: "id",
    },
    {
      title: "Metadata",
      key: "metadata",
      render: ({ id }: { id: string }) => {
        return (
          <Button
            onClick={() => {
              showMetadataSchema(id);
            }}
          >
            <EyeOutlined />
            Show schema
          </Button>
        );
      },
    },
  ];

  const { revisionId }: { revisionId: string } = useParams();

  const loadTableData = useCallback(async () => {
    setLoading(true);
    try {
      const data: { items: TableDataType[]; total: number } = await loadData(
        revisionId,
        page
      );
      if (data) {
        setDataSource(data.items);
        setTotalItems(data.total);
      }
      setLoading(false);
    } catch (ex) {
      setLoading(false);
    }
  }, [loadData, page, revisionId]);

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
    hasErrorLoadingData,
    loadTableData,
  };
}
