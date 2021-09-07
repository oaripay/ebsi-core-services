import React, { useContext } from "react";
import { Layout } from "antd";
import { NewApp } from "./NewApp";
import { ModalUpdateAuthorization } from "../../Modals/ModalUpdateAuthorization";
import { ModalUpdateAppPublicKey } from "../../Modals/ModalUpdateAppPublicKey";
import { ModalUpdateApp } from "../../Modals/ModalUpdateApp";
import ModalInsertPublicKey from "../../Modals/ModalInsertPublicKey";
import ModalInsertAuth from "../../Modals/ModalInsertAuth";
import { AppContext } from "../../AppContext";
import { useRegistryContractEventsHook } from "../../hooks/use-registry-contract-events.hook";
import { useSearchEventsHook } from "../../hooks/use-search-events.hook";

export default function TrustedAppRegistry() {
  const { Footer } = Layout;
  const appCtx = useContext(AppContext);
  useRegistryContractEventsHook();
  useSearchEventsHook();

  if (!appCtx.metamask) {
    return <></>;
  }
  return (
    <div>
      <NewApp />
      <ModalUpdateAuthorization />
      <ModalUpdateAppPublicKey />
      <ModalUpdateApp />
      <ModalInsertPublicKey />
      <ModalInsertAuth />
      <Footer style={{ textAlign: "center" }}>EBSI</Footer>
    </div>
  );
}
