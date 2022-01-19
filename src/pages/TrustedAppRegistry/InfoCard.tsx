import React, { ReactElement } from "react";
import { Card, Col, Row } from "antd";
import Title from "antd/lib/typography/Title";
import { EyeOutlined } from "@ant-design/icons";

export default function InfoCard(): ReactElement {
  return (
    <Col lg={12}>
      <Card title={<Title>Trusted Apps Registry</Title>}>
        <Row>
          <p>
            Trusted Apps Registry (TAR) is an EBSI core service. It enables to:
          </p>
          <ul>
            <li>
              manage (register/update/revoke) trusted EBSI and trusted external
              applications,
            </li>
            <li>manage application authorizations,</li>
            <li>manage application administrators,</li>
            <li>obtain application information,</li>
            <li>obtain application authorizations.</li>
          </ul>
          <Row align="middle">
            <a
              href="https://ec.europa.eu/cefdigital/wiki/display/BLOCKCHAININT/EBSI+V2+-+Trusted+Apps+Registry+API"
              target="_blank"
              rel="noopener noreferrer"
            >
              <EyeOutlined /> See more
            </a>
          </Row>
        </Row>
      </Card>
    </Col>
  );
}
