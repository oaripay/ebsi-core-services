import React from "react";
import { Col, Layout, Row, Space } from "antd";
import { NewApp } from "./NewApp";
import { ModalUpdateAppPublicKey } from "./modals/ModalUpdateAppPublicKey";
import { ModalUpdateApp } from "./modals/ModalUpdateApp";
import ModalInsertPublicKey from "./modals/ModalInsertPublicKey";
import { useAppContext } from "../../AppContext";
import { useVerifyNetworkEffectHook } from "../../hooks/use-verify-network-effect.hook";
import { useSearchEventsHook } from "../../hooks/use-search-events.hook";
import InfoCard from "./InfoCard";

export default function TrustedAppRegistry() {
  const { Footer } = Layout;
  const appCtx = useAppContext();
  useVerifyNetworkEffectHook();
  useSearchEventsHook();

  if (!appCtx.metamask) {
    return <></>;
  }
  return (
    <Space direction="vertical" className="content-container" size="middle">
      <InfoCard />
      <Row>
        <Col>
          <NewApp />
          <ModalUpdateAppPublicKey />
          <ModalUpdateApp />
          <ModalInsertPublicKey />
        </Col>
      </Row>

      <Footer style={{ textAlign: "center" }}>EBSI</Footer>
    </Space>
  );
}
