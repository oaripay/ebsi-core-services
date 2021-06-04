import React, { ReactElement, useContext } from "react";

import { NewApp } from "./NewApp";
import { AppContext } from "./AppContext";
import ModalInsertPublicKey from "./Modals/ModalInsertPublicKey";
import ModalInsertAuth from "./Modals/ModalInsertAuth";
import { useRegistryContractEventsHook } from "./hooks/use-registry-contract-events.hook";
import { ModalUpdateApp } from "./Modals/ModalUpdateApp";
import { ModalUpdateAppPublicKey } from "./Modals/ModalUpdateAppPublicKey";
import { ModalUpdateAuthorization } from "./Modals/ModalUpdateAuthorization";
import { useSearchEventsHook } from "./hooks/use-search-events.hook";

export default function BodyComponents(): ReactElement {
  const appCtx = useContext(AppContext);
  useRegistryContractEventsHook();
  useSearchEventsHook();

  if (!appCtx.metamask) {
    return <></>;
  }

  return (
    <>
      <NewApp />
      <ModalUpdateAuthorization />
      <ModalUpdateAppPublicKey />
      <ModalUpdateApp />
      <ModalInsertPublicKey />
      <ModalInsertAuth />
    </>
  );
}
