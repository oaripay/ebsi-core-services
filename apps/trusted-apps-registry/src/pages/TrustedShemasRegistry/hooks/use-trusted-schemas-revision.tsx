import React, { useCallback, useState } from "react";
import { Row, Spin } from "antd";
import JSONPretty from "react-json-pretty";
import { ethers } from "ethers";
import { useEthersHook } from "../../../hooks/use-ethers.hook";
import { useModalContext } from "../Modal.context";
import { getReversedValue } from "../../../helpers/pagination";
import { PAGE_SIZE } from "../../TrustedPoliciesRegistry/constants";

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

  const getTotal = useCallback(
    async (schemaId: string) => {
      if (!trustedSchemaRegistryContract) {
        return 0;
      }
      try {
        const data = await trustedSchemaRegistryContract.getSchemaRevisionIds(
          schemaId,
          1,
          1
        );
        return data.total.toNumber();
      } catch (ex) {
        return 0;
      }
    },
    [trustedSchemaRegistryContract]
  );

  const loadData = useCallback(
    async (schemaId: string, page, pageSize) => {
      if (!trustedSchemaRegistryContract) {
        return {
          items: [],
          total: 0,
        };
      }
      const total = await getTotal(schemaId);
      try {
        const data = await trustedSchemaRegistryContract.getSchemaRevisionIds(
          schemaId,
          getReversedValue(page, PAGE_SIZE, total),
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
    [getTotal, trustedSchemaRegistryContract]
  );
  return {
    loadData,
    hasErrorLoadingData,
    loadSchemaRevisionById,
  };
}
