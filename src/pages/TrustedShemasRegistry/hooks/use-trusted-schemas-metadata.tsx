import React, { useCallback, useState } from "react";
import { ethers } from "ethers";
import { Row, Spin } from "antd";
import JSONPretty from "react-json-pretty";
import { useEthersHook } from "../../../hooks/use-ethers.hook";
import { PaginatedResponseType } from "../../../shared/PaginatedResponseType";
import { PAGE_SIZE } from "../../TrustedIssuersRegistry/constants";
import { useModalContext } from "../Modal.context";

export default function useTrustedSchemasMetadata() {
  const { trustedSchemaRegistryContract } = useEthersHook();

  const [hasErrorLoadingData, setHasErrorLoading] = useState(false);

  const { showModal } = useModalContext();

  const loadData = useCallback(
    async (schemaRevisionId: string, page) => {
      if (!trustedSchemaRegistryContract) {
        return {
          items: [],
          total: 0,
        };
      }
      try {
        setHasErrorLoading(false);
        const metadataIds: PaginatedResponseType =
          await trustedSchemaRegistryContract.getSchemaRevisionMetadataIds(
            schemaRevisionId,
            page,
            PAGE_SIZE
          );

        return {
          total: metadataIds.total.toNumber(),
          items: metadataIds.items.map((metadataId) => ({
            id: metadataId,
          })),
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

  const showMetadataSchema = useCallback(
    async (metadataId: string) => {
      if (!trustedSchemaRegistryContract) {
        return;
      }
      showModal(
        <Row align="middle" justify="center">
          <Spin />
        </Row>
      );
      const metadataSchema = await trustedSchemaRegistryContract
        .getSchemaRevisionMetadataByMetadataId(metadataId)
        .then((metadata: string) => ethers.utils.toUtf8String(metadata));
      showModal(<JSONPretty id="json-pretty" data={metadataSchema} />);
    },
    [showModal, trustedSchemaRegistryContract]
  );

  return {
    loadData,
    hasErrorLoadingData,
    showMetadataSchema,
  };
}
