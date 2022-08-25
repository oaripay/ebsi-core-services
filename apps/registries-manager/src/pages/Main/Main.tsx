import React from "react";
import { Card, Col, Row, Space } from "antd";
import Title from "antd/lib/typography/Title";
import PoliciesContextProvider from "../TrustedPoliciesRegistry/Policies.context";
import Chart from "./Chart";

export default function Main() {
  return (
    <Row className="content-container w-100">
      <Space direction="vertical">
        <Col lg={12}>
          <Card title={<Title>Registries App Manager</Title>}>
            <Row>
              <p>
                The Registries App Manager is a webapp to manage and visualize
                the entries of the EBSI Trusted Registries. Using this webapp,
                the use can navigate through the content of each Trusted
                Registry and visualize the content of each entry. Also, in the
                case the user is authorized, he can insert or update entries.
              </p>
            </Row>
          </Card>
        </Col>
        <Col lg={12}>
          <h2>Statistics</h2>
          <PoliciesContextProvider>
            <Chart />
          </PoliciesContextProvider>
        </Col>
      </Space>
    </Row>
  );
}
