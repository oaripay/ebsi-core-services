import { useCallback } from "react";
import { FormInstance, notification } from "antd";
import { ethers } from "ethers";
import { useEthersHook } from "../../hooks/use-ethers.hook";
import { getIdentifierFromWalletAddr } from "./DidUtils";

type PropType = {
  insertDidControllerForm: FormInstance;
  updateDidControllerForm: FormInstance;
  insertAdminForm: FormInstance;
  updateAdminForm: FormInstance;
};

export default function useDidControllerModal({
  insertDidControllerForm,
  updateDidControllerForm,
  insertAdminForm,
  updateAdminForm,
}: PropType) {
  const { didRegistryContract } = useEthersHook();

  const updateAdministrator = useCallback(() => {
    if (!didRegistryContract) {
      return undefined;
    }
    return updateAdminForm
      .validateFields(["walletAddress", "attribute"])
      .then(() => {
        const fields = updateAdminForm.getFieldsValue([
          "walletAddress",
          "attribute",
        ]);
        const didAsBytes = ethers.utils.toUtf8Bytes(fields.attribute);
        return didRegistryContract["updateAdministrator(string,bytes)"](
          getIdentifierFromWalletAddr(fields.walletAddress),
          didAsBytes
        )
          .then(() => {
            notification.success({
              message: "Action successful",
              description: "Administrator was updated successfully!",
            });
          })
          .catch(() => {
            notification.error({
              message: "Error",
              description:
                "An error appeared while trying to update the DID. Please try again",
            });
          });
      });
  }, [didRegistryContract, updateAdminForm]);

  const insertAdministrator = useCallback(() => {
    if (!didRegistryContract) {
      return undefined;
    }
    return insertAdminForm.validateFields(["walletAddress"]).then(() => {
      const fields = insertAdminForm.getFieldsValue(["walletAddress"]);
      const didAsBytes = ethers.utils.toUtf8Bytes(
        getIdentifierFromWalletAddr(fields.walletAddress)
      );
      return didRegistryContract
        .insertAdministrator(
          getIdentifierFromWalletAddr(fields.walletAddress),
          didAsBytes
        )
        .then(() => {
          notification.success({
            message: "Action successful",
            description: "Administrator was inserted successfully!",
          });
        })
        .catch(() => {
          notification.error({
            message: "Error",
            description:
              "An error appeared while trying to insert the DID. Please try again",
          });
        });
    });
  }, [insertAdminForm, didRegistryContract]);

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
            })
            .catch((ex: any) => {
              console.log("Ex 2", ex);
            });
        })
        .catch((ex) => {
          console.log("Ex: ", ex);
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
    insertAdministrator,
    updateAdministrator,
  };
}
