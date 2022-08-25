import { useCallback, useState } from "react";
import { ethers } from "ethers";
import { useForm } from "antd/es/form/Form";
import { notification } from "antd";
import { useEthersHook } from "../../../hooks/use-ethers.hook";
import { useNotificationContext } from "../../../components/Notification/Notification.context";

export default function useAddTrustedIssuer() {
  const { trustedIssuersContract } = useEthersHook();
  const [form] = useForm();
  const [submitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [hasFieldsErrors, setHasFieldsErrors] = useState(true);
  const { setShowPendingTxNotif } = useNotificationContext();
  const insertIssuer = useCallback(
    (did: string) => {
      if (!trustedIssuersContract) {
        return undefined;
      }
      const didAsBytes = ethers.utils.toUtf8Bytes(did);
      return trustedIssuersContract.insertIssuer(did, didAsBytes);
    },
    [trustedIssuersContract]
  );

  const doesDidExist = useCallback(
    (did: string) => {
      if (!trustedIssuersContract) {
        return false;
      }
      return trustedIssuersContract
        .getIssuer(did)
        .then(() => true)
        .catch(() => false);
    },
    [trustedIssuersContract]
  );

  const submit = useCallback(async () => {
    const fields = form.getFieldsValue(["did"]);
    try {
      setIsSubmitting(true);
      setShowPendingTxNotif(true);
      const didExists = await doesDidExist(fields.did);
      if (fields.did.indexOf("did:ebsi:") !== 0) {
        form.setFields([
          {
            name: "did",
            errors: ["DID format is not valid. It should contain did:ebsi"],
          },
        ]);
        setIsSubmitting(false);
        setShowPendingTxNotif(false);
        return;
      }
      if (didExists) {
        notification.error({
          message: "Error",
          description: `DID already exists`,
        });
        setIsSubmitting(false);
        setShowPendingTxNotif(false);
        return;
      }

      const tx = await insertIssuer(fields.did);
      await tx.wait(1);
      notification.success({
        message: "Action successful",
        description: "Issuer has been inserted!",
      });
      setShowPendingTxNotif(false);
      setIsSubmitting(false);
    } catch (ex) {
      setShowPendingTxNotif(false);
      setIsSubmitting(false);
    }
  }, [doesDidExist, form, insertIssuer, setShowPendingTxNotif]);

  return {
    form,
    insertIssuer,
    doesDidExist,
    submit,
    submitting,
    showModal,
    setShowModal,
    hasFieldsErrors,
    setHasFieldsErrors,
  };
}
