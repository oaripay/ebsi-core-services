import React, { useCallback } from "react";
import { ethers } from "ethers";

import JSONPretty from "react-json-pretty";
import { notification, Row, Spin } from "antd";
import { useEthersHook } from "../../../hooks/use-ethers.hook";
import { useNotificationContext } from "../../../components/Notification/Notification.context";
import { useModalContext } from "../Modal.context";
import { getReversedValue } from "../../../helpers/pagination";

export default function useTrustedSchemasRegistry() {
  const { trustedSchemaRegistryContract } = useEthersHook();
  const { setShowPendingTxNotif } = useNotificationContext();

  const { showModal } = useModalContext();

  const insertSchema = useCallback(
    async (schemaId: string, schema: string, metadata: string) => {
      if (!trustedSchemaRegistryContract) {
        return;
      }
      try {
        setShowPendingTxNotif(true);
        const tx = await trustedSchemaRegistryContract.insertSchema(
          ethers.utils.toUtf8Bytes(schemaId),
          ethers.utils.toUtf8Bytes(schema),
          ethers.utils.toUtf8Bytes(metadata)
        );
        await tx.wait(1);
        notification.success({
          message: "Action successful",
          description: `The Schema was inserted successfully!`,
        });
        setShowPendingTxNotif(false);
      } catch (ex) {
        notification.error({
          message: "Error",
          description: `An error appeared while inserting the Schema. Please try again later!`,
        });
        setShowPendingTxNotif(false);
      }
    },
    [setShowPendingTxNotif, trustedSchemaRegistryContract]
  );

  const updateSchema = useCallback(
    async (schemaId: string, schema: string, metadata: string) => {
      if (!trustedSchemaRegistryContract) {
        return;
      }
      try {
        setShowPendingTxNotif(true);
        const tx = await trustedSchemaRegistryContract.updateSchema(
          schemaId,
          ethers.utils.toUtf8Bytes(schema),
          ethers.utils.toUtf8Bytes(metadata)
        );
        await tx.wait(1);
        notification.success({
          message: "Action successful",
          description: `The Schema was updated successfully!`,
        });
        setShowPendingTxNotif(false);
      } catch (ex) {
        notification.error({
          message: "Error",
          description: `An error appeared while updating the Schema. Please try again later!`,
        });
        setShowPendingTxNotif(false);
      }
    },
    [setShowPendingTxNotif, trustedSchemaRegistryContract]
  );

  const updateSchemaMetadataByRevisionId = useCallback(
    async (schemaRevisionId: string, metadata: string) => {
      if (!trustedSchemaRegistryContract) {
        return;
      }
      try {
        setShowPendingTxNotif(true);
        const tx = await trustedSchemaRegistryContract.updateMetadata(
          schemaRevisionId,
          ethers.utils.toUtf8Bytes(metadata)
        );
        await tx.wait(1);
        notification.success({
          message: "Action successful",
          description: `Metadata was updated successfully!`,
        });
        setShowPendingTxNotif(false);
      } catch (ex) {
        notification.error({
          message: "Error",
          description: `An error appeared while updating Metadata. Please try again later!`,
        });
        setShowPendingTxNotif(false);
      }
    },
    [setShowPendingTxNotif, trustedSchemaRegistryContract]
  );

  const showLatestSchemaRevision = useCallback(
    async (schemaId: string) => {
      if (!trustedSchemaRegistryContract) {
        return;
      }
      showModal(
        <Row align="middle" justify="center">
          <Spin />
        </Row>
      );
      const response =
        await trustedSchemaRegistryContract.getLatestSchemaRevision(schemaId);
      showModal(
        <JSONPretty
          id="json-pretty"
          data={ethers.utils.toUtf8String(response)}
        />
      );
    },
    [showModal, trustedSchemaRegistryContract]
  );

  const getTotal = useCallback(async () => {
    if (!trustedSchemaRegistryContract) {
      return 0;
    }
    try {
      const schemaIds = await trustedSchemaRegistryContract.getSchemaIds(1, 1);
      return schemaIds.total.toNumber();
    } catch (ex) {
      return 0;
    }
  }, [trustedSchemaRegistryContract]);

  const loadData = useCallback(
    async (page: number, pageSize: number) => {
      if (!trustedSchemaRegistryContract) {
        return {
          items: [],
          total: 0,
        };
      }
      const total = await getTotal();
      const schemaIds = await trustedSchemaRegistryContract.getSchemaIds(
        getReversedValue(page, pageSize, total),
        pageSize
      );
      const lastRevisionsForSchemaPromises = schemaIds.items.map(
        (item: string) =>
          trustedSchemaRegistryContract.getLatestSchemaRevision(item)
      );

      const lastRevisionsForSchema: string[] = await Promise.all(
        lastRevisionsForSchemaPromises
      );

      return {
        items: schemaIds.items.map((item: string, index: number) => ({
          id: item,
          latestSchemaRevisionId: ethers.utils.toUtf8String(
            lastRevisionsForSchema[index]
          ),
        })),
        total: schemaIds.total,
      };
    },
    [getTotal, trustedSchemaRegistryContract]
  );

  return {
    loadData,
    insertSchema,
    updateSchema,
    updateSchemaMetadataByRevisionId,
    showLatestSchemaRevision,
    getTotal,
  };
}
