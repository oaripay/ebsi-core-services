import React from "react";

import { Alert, Button, Col, Row, Space, Spin, Statistic } from "antd";
import { config } from "../../config";
import useDidRegister from "./use-did-register";
import RegisterDidTable from "./RegisterDidTable";
import { getIdentifierFromWalletAddr } from "./DidUtils";
import { useRegisterDidContext } from "./RegisterDid.context";

export default function RegisterDid() {
  const { loading, networkId, publicKey, didDefined, didAsAdministrator } =
    useRegisterDidContext();

  const { registerDid, insertDidAs, walletAddress } = useDidRegister();

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
              value={getIdentifierFromWalletAddr(walletAddress)}
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
            onClick={() =>
              registerDid(getIdentifierFromWalletAddr(walletAddress))
            }
          >
            Register DID
          </Button>
          <Button
            type="primary"
            className="m-l-4"
            disabled={!didDefined || !publicKey || didAsAdministrator}
            onClick={() =>
              insertDidAs(getIdentifierFromWalletAddr(walletAddress))
            }
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
