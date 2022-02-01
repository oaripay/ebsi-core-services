import React from "react";
import { EyeOutlined } from "@ant-design/icons";

import { Alert, Button, Card, Col, Row, Space, Spin, Statistic } from "antd";
import Title from "antd/lib/typography/Title";
import { config } from "../../config";
import useDidRegister from "./hooks/use-did-register";
import RegisterDidTable from "./RegisterDidTable";
import { useRegisterDidContext } from "./RegisterDid.context";

export default function RegisterDid() {
  const { loading, networkId, publicKey, didDefined, didAsAdministrator } =
    useRegisterDidContext();

  const { registerDid, insertDidAs, walletAddress } = useDidRegister();
  const { identifier } = useRegisterDidContext();

  const DidAsAdministratorMessage = () =>
    didAsAdministrator ? (
      <Alert
        message="DID Administrator already defined"
        type="info"
        showIcon
        className="m-l-4"
      />
    ) : (
      <></>
    );

  return (
    <Space direction="vertical" className="content-container" size="middle">
      <Col lg={12}>
        <Card title={<Title>DID Registry</Title>}>
          <Row>
            <p>
              DID Registry is an EBSI core service consisting of DID Registry
              Smart Contracts deployed on the EBSI ledger and REST APIs. DID
              Registry stores the DIDs and DID Documents and manages the user
              access and rights.
            </p>
            <Row align="middle">
              <a
                rel="noreferrer"
                target="_blank"
                href="https://ec.europa.eu/cefdigital/wiki/display/BLOCKCHAININT/EBSI+DID+Registry"
              >
                <EyeOutlined /> See more
              </a>
            </Row>
          </Row>
        </Card>
      </Col>

      <Spin spinning={loading}>
        <Row justify="space-between">
          <Col>
            <Statistic
              title="Network id"
              value={networkId}
              decimalSeparator=""
              groupSeparator=""
            />
          </Col>
        </Row>
        <Row className="m-t-10">
          <Col>
            <Statistic
              title="Public key"
              value={publicKey}
              decimalSeparator=""
              groupSeparator=""
            />
          </Col>
        </Row>
        <Row className="m-t-10">
          <Col>
            <Statistic
              title="Wallet address"
              value={walletAddress}
              decimalSeparator=""
              groupSeparator=""
            />
          </Col>
        </Row>
        <Row className="m-t-10">
          <Col>
            <Statistic
              title="DID"
              value={identifier}
              decimalSeparator=""
              groupSeparator=""
            />
          </Col>
        </Row>
        <Row className="m-t-10">
          <Col>
            <Statistic
              title="DID Registry contract"
              value={config.DID_REGISTRY_ADDRESS}
              decimalSeparator=""
              groupSeparator=""
            />
          </Col>
        </Row>
        <Row className="m-t-10">
          <Button
            type="primary"
            disabled={didDefined || !publicKey}
            onClick={() => registerDid(identifier)}
          >
            Register DID
          </Button>
          <Button
            type="primary"
            className="m-l-4"
            disabled={!didDefined || !publicKey || didAsAdministrator}
            onClick={() => insertDidAs(identifier)}
          >
            Insert DID as Administrator
          </Button>
        </Row>
        <Row className="m-t-10">
          <Col>
            {didDefined ? (
              <Alert message="DID already defined" type="info" showIcon />
            ) : (
              <></>
            )}
          </Col>
          <Col>
            <DidAsAdministratorMessage />
          </Col>
        </Row>
        <Row className="m-t-10">
          <RegisterDidTable />
        </Row>
      </Spin>
    </Space>
  );
}
