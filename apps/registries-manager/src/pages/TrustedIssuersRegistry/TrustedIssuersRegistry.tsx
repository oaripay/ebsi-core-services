import React, { ReactElement } from "react";
import { Card, Col, Row, Space } from "antd";
import Title from "antd/lib/typography/Title";
import { EyeOutlined } from "@ant-design/icons";
import { useParams } from "react-router-dom";
import TrustedTable from "./TrustedTable";
import TrustedIssuerAttributes from "./TrustedIssuerAttributes";
import AddIssuer from "./AddIssuer";
import { useVerifyNetworkEffectHook } from "../../hooks/use-verify-network-effect.hook";

export default function TrustedIssuersRegistry(): ReactElement {
  useVerifyNetworkEffectHook();

  interface RouteParams {
    attribute: string;
  }

  const { attribute } = useParams<RouteParams>();

  return (
    <Space direction="vertical" className="content-container" size="middle">
      <Col lg={12}>
        <Card title={<Title>Trusted Issuers Registry</Title>}>
          <Row>
            <p>
              Trusted Issuers Registry is a generic decentralized registry
              holding information about trusted issuers, like public
              information, accreditations and other. All information is stored
              in the smart contract in form of Attribue envelops (like
              Verifiable Credentials) that are issued by Trusted Issuers or
              self-issued. Generic Envelop (like Verifiable Credential)
              validation is performed outside EBSI.
            </p>
            <Row align="middle">
              <a
                href="https://ec.europa.eu/cefdigital/wiki/display/BLOCKCHAININT/EBSI+V2+-+Trusted+Issuers+Registry+API"
                target="_blank"
                rel="noreferrer"
              >
                <EyeOutlined /> See more
              </a>
            </Row>
          </Row>
        </Card>
      </Col>

      {attribute ? (
        <TrustedIssuerAttributes did={attribute} />
      ) : (
        <Row>
          <Col lg={24}>
            <Space direction="vertical">
              <AddIssuer />
              <TrustedTable />
            </Space>
          </Col>
        </Row>
      )}
    </Space>
  );
}
