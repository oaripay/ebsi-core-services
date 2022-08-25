import { useCallback, useState } from "react";
import { ethers } from "ethers";
import { Form } from "antd";
import { useEthersHook } from "../../hooks/use-ethers.hook";
import { EditFormValueType, PaginatedResponseTypeString } from "./types";
import { useTrustedPoliciesUsersContext } from "./PoliciesUsers.context";
import { PAGE_SIZE } from "./constants";
import { useNotificationContext } from "../../components/Notification/Notification.context";
import { getReversedValue } from "../../helpers/pagination";

export default function useUserAttributes() {
  const { policyRegistryContract } = useEthersHook();
  const { attributesPage, setAttributes, setAttributesLoading } =
    useTrustedPoliciesUsersContext();

  const [isShowEditUserAttrModal, setShowEditUserAttrModal] = useState(false);
  const { setShowPendingTxNotif } = useNotificationContext();

  const showEditUserAttrModal = useCallback(() => {
    setShowEditUserAttrModal(true);
  }, []);

  const hideEditUserAttrModal = useCallback(() => {
    setShowEditUserAttrModal(false);
  }, []);

  const [editAttributeForm] = Form.useForm();

  const getTotal = useCallback(
    async (address: string) => {
      if (!policyRegistryContract) {
        return 0;
      }
      try {
        const attributes: PaginatedResponseTypeString =
          await policyRegistryContract.getUserAttributes(address, 1, 1);
        return attributes.total.toNumber();
      } catch (ex) {
        return 0;
      }
    },
    [policyRegistryContract]
  );

  const getUserAttributes = useCallback(
    async (address: string) => {
      if (!policyRegistryContract) {
        return;
      }
      const total = await getTotal(address);
      try {
        setAttributesLoading(true);
        const attributes: PaginatedResponseTypeString =
          await policyRegistryContract.getUserAttributes(
            address,
            getReversedValue(attributesPage, PAGE_SIZE, total),
            PAGE_SIZE
          );

        const attributesValues = await Promise.all(
          attributes.items.map((item) =>
            policyRegistryContract.getUserAttribute(address, item)
          )
        );

        setAttributes(
          attributes.items.length
            ? attributes.items.map((item, index: number) => {
                return {
                  id: index,
                  name: item,
                  value: ethers.utils.toUtf8String(attributesValues[index]),
                };
              })
            : []
        );
        setAttributesLoading(false);
      } catch (ex) {
        setAttributes([]);
        setAttributesLoading(false);
      }
    },
    [
      attributesPage,
      getTotal,
      policyRegistryContract,
      setAttributes,
      setAttributesLoading,
    ]
  );

  const deleteAttribute = useCallback(
    async (address: string, attribute: string) => {
      if (!policyRegistryContract) {
        return;
      }
      try {
        setShowPendingTxNotif(true);
        const tx = await policyRegistryContract.deleteUserAttribute(
          address,
          attribute
        );
        await tx.wait(1);
        setShowPendingTxNotif(false);
        await getUserAttributes(address);
      } catch (ex) {
        setShowPendingTxNotif(false);
      }
    },
    [getUserAttributes, policyRegistryContract, setShowPendingTxNotif]
  );

  const editAttribute = useCallback(
    async (formValues: EditFormValueType) => {
      if (!policyRegistryContract) {
        return;
      }
      try {
        setShowPendingTxNotif(true);
        const tx = await policyRegistryContract.updateUserAttribute(
          formValues.address,
          formValues.attribute,
          ethers.utils.toUtf8Bytes(formValues.value)
        );
        await tx.wait(1);
        setShowPendingTxNotif(false);
        await getUserAttributes(formValues.address);
      } catch (ex) {
        setShowPendingTxNotif(false);
      }
    },
    [getUserAttributes, policyRegistryContract, setShowPendingTxNotif]
  );

  return {
    getUserAttributes,
    deleteAttribute,
    editAttributeForm,
    showEditUserAttrModal,
    hideEditUserAttrModal,
    isShowEditUserAttrModal,
    editAttribute,
  };
}
