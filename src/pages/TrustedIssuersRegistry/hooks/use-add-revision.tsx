import { useCallback, useState } from "react";
import { useForm } from "antd/es/form/Form";
import { ethers } from "ethers";
import { notification } from "antd";
import { useEthersHook } from "../../../hooks/use-ethers.hook";
import { useNotificationContext } from "../../../components/Notification/Notification.context";

export default function useAddRevision() {
  const { trustedIssuersContract } = useEthersHook();
  const [form] = useForm();
  const [submitting, setIsSubmitting] = useState(false);
  const { setShowPendingTxNotif } = useNotificationContext();
  const [hasFieldsErrors, setHasFieldsErrors] = useState(true);
  const submit = useCallback(
    async (did: string) => {
      if (!trustedIssuersContract) {
        return false;
      }
      return form.validateFields(["attribute", "revision"]).then(async () => {
        setIsSubmitting(true);
        setShowPendingTxNotif(true);
        const fields = form.getFieldsValue(["attribute", "revision"]);
        try {
          const revision = ethers.utils.toUtf8Bytes(fields.revision);
          const tx = await trustedIssuersContract[
            "updateIssuer(string,bytes,bytes32)"
          ](did, revision, fields.attribute);
          await tx.wait(1);
          notification.success({
            message: "Action successful",
            description: "Revision was inserted!",
          });
          setShowPendingTxNotif(false);
          setIsSubmitting(false);
          return true;
        } catch (ex) {
          setShowPendingTxNotif(false);
          setIsSubmitting(false);
          return false;
        }
      });
    },
    [form, setShowPendingTxNotif, trustedIssuersContract]
  );

  return {
    form,
    submitting,
    setIsSubmitting,
    submit,
    hasFieldsErrors,
    setHasFieldsErrors,
  };
}
