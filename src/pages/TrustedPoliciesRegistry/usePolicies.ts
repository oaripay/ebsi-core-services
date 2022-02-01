import { useCallback, useState } from "react";
import { ethers } from "ethers";
import { useEthersHook } from "../../hooks/use-ethers.hook";
import {
  InsertNewPolicyValueType,
  PaginatedResponseTypeBn,
  PolicyCondition,
} from "./types";
import { PAGE_SIZE } from "./constants";
import { useTrustedPoliciesContext } from "./Policies.context";
import { useNotificationContext } from "../../components/Notification/Notification.context";
import { getReversedValue } from "../../helpers/pagination";

export default function usePolicies() {
  const { policyRegistryContract } = useEthersHook();
  const { setLoading, setTotalItems, page, setPolicies, editNewPolicyForm } =
    useTrustedPoliciesContext();
  const [isShowInsertNewPolicyModal, setIsShowInsertNewPolicyModal] =
    useState(false);

  const [isShowEditNewPolicyModal, setIsShowEditNewPolicyModal] =
    useState(false);

  const { setShowPendingTxNotif } = useNotificationContext();

  const getTotal = useCallback(async () => {
    if (!policyRegistryContract) {
      return 0;
    }
    try {
      const policiesResult: PaginatedResponseTypeBn =
        await policyRegistryContract.getPolicies(1, 1);
      return policiesResult.total.toNumber();
    } catch (ex) {
      return 0;
    }
  }, [policyRegistryContract]);

  const getPolicies = useCallback(async () => {
    if (!policyRegistryContract) {
      return;
    }
    try {
      setLoading(true);

      const total = await getTotal();

      const policiesResult: PaginatedResponseTypeBn =
        await policyRegistryContract.getPolicies(
          getReversedValue(page, PAGE_SIZE, total),
          PAGE_SIZE
        );
      setTotalItems(policiesResult.total.toNumber());

      const policiesResolved = await Promise.all(
        policiesResult.items.map((item) => {
          return policyRegistryContract["getPolicy(uint256)"](item.toNumber());
        })
      );

      setPolicies(
        policiesResult.items.map((item, index) => ({
          id: item.toNumber(),
          policyName: policiesResolved[index].policyName,
          opType: policiesResolved[index].opType,
          description: policiesResolved[index].description,
          parentId: policiesResolved[index].parentId,
          status: policiesResolved[index].status,
          policyConditions: policiesResolved[index].policyConditions.map(
            (condition: PolicyCondition) => {
              let value;
              try {
                value = ethers.utils.toUtf8String(condition.value);
              } catch (e) {
                value = condition.value;
              }
              return {
                ...condition,
                value,
              };
            }
          ),
        }))
      );
      setLoading(false);
    } catch (ex) {
      setLoading(false);
    }
  }, [
    getTotal,
    page,
    policyRegistryContract,
    setLoading,
    setPolicies,
    setTotalItems,
  ]);

  const runPolicyAction = useCallback(
    async (functionName: string, policyId: number) => {
      if (!policyRegistryContract) {
        return undefined;
      }
      try {
        const tx = await policyRegistryContract[functionName](policyId);
        setShowPendingTxNotif(true);
        await tx.wait(1);
        setShowPendingTxNotif(false);
        await getPolicies();
        return true;
      } catch (ex) {
        setShowPendingTxNotif(false);
        return false;
      }
    },
    [getPolicies, policyRegistryContract, setShowPendingTxNotif]
  );

  const activatePolicy = useCallback(
    async (policyId: number) => {
      await runPolicyAction("activatePolicy", policyId);
    },
    [runPolicyAction]
  );

  const deactivatePolicy = useCallback(
    async (policyId: number) => {
      await runPolicyAction("deactivatePolicy", policyId);
    },
    [runPolicyAction]
  );

  const editPolicy = useCallback(
    async (values: InsertNewPolicyValueType) => {
      if (!policyRegistryContract) {
        return;
      }

      try {
        const tx = await policyRegistryContract.updatePolicy(
          values.id,
          values.opType,
          values.policyName,
          values.description
        );
        setShowPendingTxNotif(true);
        await tx.wait(1);
        setShowPendingTxNotif(false);
        await getPolicies();
      } catch (ex) {
        setShowPendingTxNotif(false);
      }
    },
    [getPolicies, policyRegistryContract, setShowPendingTxNotif]
  );

  const deletePolicyCondition = useCallback(
    async (policyId: number, policyConditionId: number) => {
      if (!policyRegistryContract) {
        return;
      }
      try {
        const tx = await policyRegistryContract.deletePolicyCondition(
          policyId,
          policyConditionId
        );
        setShowPendingTxNotif(true);
        await tx.wait(1);
        setShowPendingTxNotif(false);
        await getPolicies();
      } catch (ex) {
        setShowPendingTxNotif(false);
      }
    },
    [getPolicies, policyRegistryContract, setShowPendingTxNotif]
  );

  const insertPolicy = useCallback(
    async (values: InsertNewPolicyValueType) => {
      if (!policyRegistryContract) {
        return;
      }
      try {
        const policyConditions =
          values?.policyConditions?.map((policyCondition) => {
            return {
              name: policyCondition.name,
              attributeName: policyCondition.attributeName,
              typeOfValue: policyCondition.typeOfValue,
              value: ethers.utils.toUtf8Bytes(policyCondition.value),
              attributeOperation: policyCondition.attributeOperation,
            };
          }) || [];
        const tx = await policyRegistryContract.insertPolicy(
          values.opType,
          policyConditions,
          values.policyName,
          values.description
        );
        setShowPendingTxNotif(true);
        await tx.wait(1);
        setShowPendingTxNotif(false);
        await getPolicies();
      } catch (ex) {
        setShowPendingTxNotif(false);
      }
    },
    [getPolicies, policyRegistryContract, setShowPendingTxNotif]
  );

  const hideShowInsertNewPolicyModal = useCallback(() => {
    setIsShowInsertNewPolicyModal(false);
  }, []);

  const hideShowEditNewPolicyModal = useCallback(() => {
    setIsShowEditNewPolicyModal(false);
  }, []);

  const showInsertNewPolicyModal = useCallback(() => {
    setIsShowInsertNewPolicyModal(true);
  }, []);

  const showEditNewPolicyModal = useCallback(
    (values) => {
      if (editNewPolicyForm) {
        editNewPolicyForm.setFieldsValue(values);
      }
      setIsShowEditNewPolicyModal(true);
    },
    [editNewPolicyForm]
  );

  return {
    insertPolicy,
    isShowInsertNewPolicyModal,
    hideShowInsertNewPolicyModal,
    showInsertNewPolicyModal,
    page,
    isShowEditNewPolicyModal,
    hideShowEditNewPolicyModal,
    showEditNewPolicyModal,
    editNewPolicyForm,
    editPolicy,
    activatePolicy,
    deactivatePolicy,
    getPolicies,
    deletePolicyCondition,
    getTotal,
  };
}
