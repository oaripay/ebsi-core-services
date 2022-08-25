import { useCallback, useState } from "react";
import { Form } from "antd";
import { ethers } from "ethers";
import { useEthersHook } from "../../hooks/use-ethers.hook";
import { useTrustedPoliciesUsersContext } from "./PoliciesUsers.context";
import { PAGE_SIZE } from "./constants";
import {
  AttributeType,
  InsertUserAttrValueType,
  PaginatedResponseTypeString,
} from "./types";
import { useNotificationContext } from "../../components/Notification/Notification.context";
import { getReversedValue } from "../../helpers/pagination";

export default function useUsers() {
  const { setLoading, loading, page, setUsers } =
    useTrustedPoliciesUsersContext();
  const { policyRegistryContract } = useEthersHook();
  const [showInsertUserAttrModal, setShowInsertUserAttrModal] = useState(false);
  const [insertUserAttrForm] = Form.useForm();
  const { setShowPendingTxNotif } = useNotificationContext();

  const hideUserInsertUserAttrModal = useCallback(() => {
    setShowInsertUserAttrModal(false);
  }, []);

  const showUserInsertUserAttrModal = useCallback(() => {
    setShowInsertUserAttrModal(true);
  }, []);

  const getTotal = useCallback(async () => {
    if (!policyRegistryContract) {
      return 0;
    }
    try {
      const attributes: PaginatedResponseTypeString =
        await policyRegistryContract.getUsers(1, 1);
      return attributes.total.toNumber();
    } catch (ex) {
      return 0;
    }
  }, [policyRegistryContract]);

  const getUsers = useCallback(async () => {
    if (!policyRegistryContract) {
      return;
    }
    try {
      setLoading(true);

      const total = await getTotal();

      const userResult: PaginatedResponseTypeString =
        await policyRegistryContract.getUsers(
          getReversedValue(page, PAGE_SIZE, total),
          PAGE_SIZE
        );
      setUsers(
        userResult.items.map((item, index) => {
          return {
            address: item,
            id: index,
          };
        })
      );
      setLoading(false);
    } catch (ex) {
      setLoading(false);
    }
  }, [getTotal, page, policyRegistryContract, setLoading, setUsers]);

  const insertUserAttributes = useCallback(
    async (values: InsertUserAttrValueType) => {
      if (!policyRegistryContract) {
        return;
      }
      try {
        setShowPendingTxNotif(true);
        const tx = await policyRegistryContract.insertUserAttributes(
          values.address,
          values.attributesWithValues.map(
            (item: AttributeType) => item.attribute
          ),
          values.attributesWithValues.map((item: AttributeType) =>
            ethers.utils.toUtf8Bytes(item.attribute)
          )
        );
        await tx.wait(1);
        setShowPendingTxNotif(false);
        await getUsers();
      } catch (ex) {
        setShowPendingTxNotif(false);
      }
    },
    [getUsers, policyRegistryContract, setShowPendingTxNotif]
  );

  return {
    getUsers,
    insertUserAttributes,
    showInsertUserAttrModal,
    hideUserInsertUserAttrModal,
    showUserInsertUserAttrModal,
    insertUserAttrForm,
    loading,
  };
}
