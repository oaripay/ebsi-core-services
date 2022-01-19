import React, { ReactElement } from "react";
import { useParams } from "react-router-dom";
import { Card, Col, Row, Space } from "antd";
import Title from "antd/lib/typography/Title";
import Text from "antd/lib/typography/Text";
import { EyeOutlined, WarningOutlined } from "@ant-design/icons";
import PoliciesContextProvider from "./Policies.context";
import TrustedPoliciesPage from "./page/TrustedPoliciesPage";
import PoliciesUsersContextProvider from "./PoliciesUsers.context";
import UserAttributePage from "./page/UserAttributePage";

export default function TrustedPoliciesRegistry(): ReactElement {
  const param: { address: string } = useParams();

  return (
    <PoliciesContextProvider>
      <PoliciesUsersContextProvider>
        <Space direction="vertical" className="content-container" size="middle">
          <Card title={<Title>Trusted Policies Registry</Title>}>
            <Row>
              <Col>
                <p>
                  Trusted Policies Registry (TPR) is an EBSI core service. It
                  enables to:
                </p>
                <ul>
                  <li>create a policy</li>
                  <li>update a policy</li>
                  <li>retrieve a policy</li>
                </ul>
                <span>
                  <Text type="warning">
                    <WarningOutlined className="m-r-4" />
                  </Text>
                  In order to insert a policy you must have{" "}
                  <strong>OPERATOR</strong> role
                </span>
                <Row align="middle">
                  <a
                    href="https://ec.europa.eu/cefdigital/wiki/display/BLOCKCHAININT/Policies+Registry+API"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <EyeOutlined /> See more
                  </a>
                </Row>
              </Col>
            </Row>
          </Card>

          {param.address ? (
            <UserAttributePage address={param.address} />
          ) : (
            <TrustedPoliciesPage />
          )}
        </Space>
      </PoliciesUsersContextProvider>
    </PoliciesContextProvider>
  );
}
