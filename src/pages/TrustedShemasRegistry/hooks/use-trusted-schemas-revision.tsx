import React, { useCallback, useState } from "react";
import { Row, Spin } from "antd";
import JSONPretty from "react-json-pretty";
import { ethers } from "ethers";
import { useEthersHook } from "../../../hooks/use-ethers.hook";
import { useModalContext } from "../Modal.context";

export default function useTrustedSchemasRevision() {
  const { trustedSchemaRegistryContract } = useEthersHook();

  const [hasErrorLoadingData, setHasErrorLoading] = useState(false);

  const { showModal } = useModalContext();

  const loadSchemaRevisionById = useCallback(
    async (schemaRevisionId: string) => {
      if (!trustedSchemaRegistryContract) {
        return;
      }
      showModal(
        <Row align="middle" justify="center">
          <Spin />
        </Row>
      );
      const response = await trustedSchemaRegistryContract.getSchemaRevision(
        schemaRevisionId
      );
      showModal(
        <JSONPretty
          id="json-pretty"
          data={ethers.utils.toUtf8String(response)}
        />
      );
    },
    [showModal, trustedSchemaRegistryContract]
  );

  const loadData = useCallback(
    async (schemaId: string, page, pageSize) => {
      if (!trustedSchemaRegistryContract) {
        return {
          items: [],
          total: 0,
        };
      }
      try {
        const data = await trustedSchemaRegistryContract.getSchemaRevisionIds(
          schemaId,
          page,
          pageSize
        );
        setHasErrorLoading(false);
        return {
          items: data.items.map((item: string) => ({
            id: item,
          })),
          total: data.total.toNumber(),
        };
      } catch (ex) {
        setHasErrorLoading(true);
        return {
          items: [],
          total: 0,
        };
      }
    },
    [trustedSchemaRegistryContract]
  );
  return {
    loadData,
    hasErrorLoadingData,
    loadSchemaRevisionById,
  };
}
