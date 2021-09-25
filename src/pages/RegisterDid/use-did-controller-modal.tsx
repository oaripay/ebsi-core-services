import { useCallback } from "react";
import { FormInstance, notification } from "antd";
import { ethers } from "ethers";
import { useEthersHook } from "../../hooks/use-ethers.hook";
import {
  buildDidParams,
  createDidDocument,
  getIdentifierFromWalletAddr,
} from "./DidUtils";
import useWalletHook from "../../hooks/use-wallet.hook";
import { useRegisterDidContext } from "./RegisterDid.context";
import { useNotificationContext } from "../../components/Notification/Notification.context";

type PropType = {
  insertDidControllerForm: FormInstance;
  updateDidControllerForm: FormInstance;
  insertAdminForm: FormInstance;
  updateAdminForm: FormInstance;
  appendDidDocumentVersionHashForm: FormInstance;
  detachDidDocumentVersionHashForm: FormInstance;
  resetModal: () => void;
};

export default function useDidControllerModal({
  insertDidControllerForm,
  updateDidControllerForm,
  insertAdminForm,
  updateAdminForm,
  appendDidDocumentVersionHashForm,
  detachDidDocumentVersionHashForm,
  resetModal,
}: PropType) {
  const { didRegistryContract } = useEthersHook();

  const { walletAddress } = useWalletHook();
  const { publicKey } = useRegisterDidContext();
  const { setShowPendingTxNotif } = useNotificationContext();

  const detachDidDocumentVersionHash = useCallback(() => {
    if (!didRegistryContract || !walletAddress || !publicKey) {
      return undefined;
    }
    return detachDidDocumentVersionHashForm
      .validateFields(["versionHash"])
      .then(async () => {
        const fields = detachDidDocumentVersionHashForm.getFieldsValue([
          "versionHash",
        ]);
        try {
          const didDocument = createDidDocument(
            getIdentifierFromWalletAddr(walletAddress),
            publicKey
          );
          const { param } = buildDidParams(didDocument);
          setShowPendingTxNotif(true);
          const tx = await didRegistryContract.detachDidDocumentVersionHash(
            param.identifier,
            param.hashAlgorithmId,
            fields.versionHash,
            param.didVersionInfo
          );
          resetModal();

          await tx.wait(1);
          notification.success({
            message: "Action successful",
            description: "Detached version hash!",
          });
          setShowPendingTxNotif(false);
          return true;
        } catch (ex) {
          setShowPendingTxNotif(false);
          notification.error({
            message: "Error",
            description:
              "An error appeared while trying to detach hash. Please try again",
          });
          resetModal();
          return false;
        }
      });
  }, [
    detachDidDocumentVersionHashForm,
    didRegistryContract,
    publicKey,
    resetModal,
    setShowPendingTxNotif,
    walletAddress,
  ]);

  const appendDidDocumentVersionHash = useCallback(() => {
    if (!didRegistryContract || !walletAddress || !publicKey) {
      return undefined;
    }
    return appendDidDocumentVersionHashForm
      .validateFields(["hashAlgorithmId", "timestamp"])
      .then(async () => {
        const fields = appendDidDocumentVersionHashForm.getFieldsValue([
          "hashAlgorithmId",
          "timestamp",
        ]);
        try {
          const didDocument = createDidDocument(
            getIdentifierFromWalletAddr(walletAddress),
            publicKey
          );
          const { param } = buildDidParams(didDocument, {
            hashAlgorithmId: fields.hashAlgorithmId,
            timestamp: {
              data: `0x${Buffer.from(`${fields.timestamp.unix()}`).toString(
                "hex"
              )}`,
            },
          });
          setShowPendingTxNotif(true);

          const tx = await didRegistryContract.appendDidDocumentVersionHash(
            param.identifier,
            param.hashAlgorithmId,
            param.hashValue,
            param.timestampData,
            param.didVersionInfo
          );
          resetModal();

          await tx.wait(1);
          notification.success({
            message: "Action successful",
            description: "Append document version hash!",
          });
          setShowPendingTxNotif(false);
          return true;
        } catch (ex) {
          setShowPendingTxNotif(false);
          notification.error({
            message: "Error",
            description:
              "An error appeared while trying to append hash. Please try again",
          });
          resetModal();
          return false;
        }
      });
  }, [
    appendDidDocumentVersionHashForm,
    didRegistryContract,
    publicKey,
    resetModal,
    setShowPendingTxNotif,
    walletAddress,
  ]);

  const updateAdministrator = useCallback(async () => {
    if (!didRegistryContract) {
      return undefined;
    }
    return updateAdminForm
      .validateFields(["walletAddress", "attribute"])
      .then(async () => {
        const fields = updateAdminForm.getFieldsValue([
          "walletAddress",
          "attribute",
        ]);
        try {
          const didAsBytes = ethers.utils.toUtf8Bytes(fields.attribute);
          setShowPendingTxNotif(true);

          const tx = await didRegistryContract[
            "updateAdministrator(string,bytes)"
          ](getIdentifierFromWalletAddr(fields.walletAddress), didAsBytes);
          resetModal();

          await tx.wait(1);
          notification.success({
            message: "Action successful",
            description: "Administrator was updated successfully!",
          });
          setShowPendingTxNotif(false);
          return true;
        } catch (ex) {
          notification.error({
            message: "Error",
            description:
              "An error appeared while trying to update the DID. Please try again",
          });
          setShowPendingTxNotif(false);
          resetModal();
          return false;
        }
      });
  }, [didRegistryContract, resetModal, setShowPendingTxNotif, updateAdminForm]);

  const insertAdministrator = useCallback(() => {
    if (!didRegistryContract) {
      return undefined;
    }
    return insertAdminForm.validateFields(["walletAddress"]).then(async () => {
      const fields = insertAdminForm.getFieldsValue(["walletAddress"]);
      const didAsBytes = ethers.utils.toUtf8Bytes(
        getIdentifierFromWalletAddr(fields.walletAddress)
      );
      try {
        setShowPendingTxNotif(true);
        const tx = await didRegistryContract.insertAdministrator(
          getIdentifierFromWalletAddr(fields.walletAddress),
          didAsBytes
        );
        resetModal();
        await tx.wait(1);
        notification.success({
          message: "Action successful",
          description: "Administrator was inserted successfully!",
        });
        setShowPendingTxNotif(false);
        return true;
      } catch (ex) {
        notification.error({
          message: "Error",
          description:
            "An error appeared while trying to insert the DID. Please try again",
        });
        setShowPendingTxNotif(false);
        resetModal();
        return false;
      }
    });
  }, [didRegistryContract, insertAdminForm, setShowPendingTxNotif, resetModal]);

  const updateDidController = useCallback(
    (identifier: string) => {
      if (!didRegistryContract) {
        return undefined;
      }

      return updateDidControllerForm
        .validateFields(["newControllerId", "notBefore", "notAfter"])
        .then(async () => {
          const fields = updateDidControllerForm.getFieldsValue([
            "newControllerId",
            "notBefore",
            "notAfter",
          ]);
          try {
            setShowPendingTxNotif(true);
            const tx = await didRegistryContract.updateDidController(
              `0x${Buffer.from(identifier).toString("hex")}`,
              fields.newControllerId,
              fields.notBefore.unix(),
              fields.notAfter.unix()
            );
            await tx.wait(1);
            notification.success({
              message: "Action successful",
              description: "DID Controller was updated successfully!",
            });
            setShowPendingTxNotif(false);
            return true;
          } catch (ex) {
            notification.error({
              message: "Error",
              description:
                "An error appeared while trying to update DID Controller. Please try again",
            });
            setShowPendingTxNotif(false);
            return false;
          }
        });
    },
    [didRegistryContract, setShowPendingTxNotif, updateDidControllerForm]
  );

  const insertDidController = useCallback(
    (identifier: string) => {
      if (!didRegistryContract) {
        return undefined;
      }
      return insertDidControllerForm
        .validateFields(["newControllerId", "notBefore", "notAfter"])
        .then(async () => {
          const fields = insertDidControllerForm.getFieldsValue([
            "newControllerId",
            "notBefore",
            "notAfter",
          ]);
          try {
            setShowPendingTxNotif(true);
            const tx = await didRegistryContract.insertDidController(
              `0x${Buffer.from(identifier).toString("hex")}`,
              fields.newControllerId,
              fields.notBefore.unix(),
              fields.notAfter.unix()
            );
            resetModal();

            await tx.wait(1);
            notification.success({
              message: "Action successful",
              description: "DID Controller was inserted successfully!",
            });
            setShowPendingTxNotif(false);
            return true;
          } catch (ex) {
            notification.error({
              message: "Error",
              description:
                "An error appeared while trying to insert DID Controller. Please try again",
            });
            resetModal();
            setShowPendingTxNotif(false);
            return false;
          }
        });
    },
    [
      didRegistryContract,
      insertDidControllerForm,
      resetModal,
      setShowPendingTxNotif,
    ]
  );

  return {
    insertDidController,
    updateDidController,
    insertAdministrator,
    updateAdministrator,
    appendDidDocumentVersionHash,
    detachDidDocumentVersionHash,
  };
}
