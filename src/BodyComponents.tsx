import React, { ReactElement, useContext } from "react";

import { NewApp } from "./NewApp";
import { ModalEditApp } from "./Modals/ModalEditApp";
import { ModalAttachAuthorizedApp } from "./Modals/ModalAttachAuthorizedApp";
import { AppContext } from "./AppContext";
import OperatorWarning from "./OperatorWarning";

export default function BodyComponents(): ReactElement {
  const appCtx = useContext(AppContext);

  if (!appCtx.metamask) {
    return <></>;
  }

  return (
    <>
      <OperatorWarning />
      <NewApp />
      <ModalEditApp />
      <ModalAttachAuthorizedApp />
    </>
  );
}
