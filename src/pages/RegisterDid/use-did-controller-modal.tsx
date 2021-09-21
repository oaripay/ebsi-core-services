import { useCallback } from "react";
import { FormInstance, notification } from "antd";
import { useEthersHook } from "../../hooks/use-ethers.hook";

type PropType = {
  insertDidControllerForm: FormInstance;
  updateDidControllerForm: FormInstance;
};

export default function useDidControllerModal({
  insertDidControllerForm,
  updateDidControllerForm,
}: PropType) {
  const { didRegistryContract } = useEthersHook();

  const updateDidController = useCallback(
    (identifier: string) => {
      if (!didRegistryContract) {
        return undefined;
      }
      return updateDidControllerForm
        .validateFields(["newControllerId", "notBefore", "notAfter"])
        .then(() => {
          const fields = updateDidControllerForm.getFieldsValue([
            "newControllerId",
            "notBefore",
            "notAfter",
          ]);
          return didRegistryContract
            .updateDidController(
              `0x${Buffer.from(identifier).toString("hex")}`,
              fields.newControllerId,
              fields.notBefore.unix(),
              fields.notAfter.unix()
            )
            .then(() => {
              notification.success({
                message: "Action successful",
                description: "DID Controller was updated successfully!",
              });
            });
        })
        .catch(() => {
          notification.error({
            message: "Error",
            description:
              "An error appeared while trying to update DID Controller. Please try again",
          });
        });
    },
    [didRegistryContract, updateDidControllerForm]
  );

  const insertDidController = useCallback(
    (identifier: string) => {
      if (!didRegistryContract) {
        return undefined;
      }
      return insertDidControllerForm
        .validateFields(["newControllerId", "notBefore", "notAfter"])
        .then(() => {
          const fields = insertDidControllerForm.getFieldsValue([
            "newControllerId",
            "notBefore",
            "notAfter",
          ]);
          return didRegistryContract
            .insertDidController(
              `0x${Buffer.from(identifier).toString("hex")}`,
              fields.newControllerId,
              fields.notBefore.unix(),
              fields.notAfter.unix()
            )
            .then(() => {
              notification.success({
                message: "Action successful",
                description: "DID Controller was inserted successfully!",
              });
            });
        })
        .catch(() => {
          notification.error({
            message: "Error",
            description:
              "An error appeared while trying to insert DID Controller. Please try again",
          });
        });
    },
    [didRegistryContract, insertDidControllerForm]
  );

  return {
    insertDidController,
    updateDidController,
  };
}
