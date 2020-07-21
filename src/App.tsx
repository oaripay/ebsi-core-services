import React, { useEffect, useMemo, useState } from "react";

import "./App.css";
import {
  Alert,
  Col,
  Layout,
  notification,
  Result,
  Row,
  Typography,
} from "antd";

import { AppProvider } from "./AppContext";
import { NewApp } from "./NewApp";
import { ModalEditApp } from "./Modals/ModalEditApp";
import { ModalAttachAuthorizedApp } from "./Modals/ModalAttachAuthorizedApp";
import { config } from "./config";
import { useRegistryContractHook } from "./hooks/use-registry-contract.hook";

const { Header, Footer } = Layout;
const { Title } = Typography;

function App() {
  const Jwt = useMemo(() => localStorage.getItem("Jwt"), []);
  const Did = useMemo(() => localStorage.getItem("Did"), []);
  const walletWebClient = config.WALLET_WEB_CLIENT_URL;

  const [operatorWarning, setOperatorWarning] = useState(false);

  const { isOperator } = useRegistryContractHook();

  useEffect(() => {
    isOperator().then((isAddrOperator) => {
      if (!isAddrOperator) {
        setOperatorWarning(true);
        notification.warning({
          message: "DID not operator",
          description:
            "Your DID is not set as an operator to the Trusted App Contract. Please be aware that you will not be able to perform any updates to the smart contract!",
        });
      }
    });
  }, []);

  return (
    <AppProvider>
      <Layout>
        <Header>
          <Row align="middle">
            <Col>
              <Title className="header-text" level={2}>
                EBSI App Manager
              </Title>
            </Col>
          </Row>
        </Header>
        {Jwt && Did ? (
          <>
            {operatorWarning && (
              <Alert
                message=""
                description={
                  <>
                    <p>
                      Your DID is not set as an operator to the Trusted App
                      Contract. Please be aware that you will not be able to
                      perform any updates to the smart contract! <br /> Should
                      you have access please contact an administrator
                    </p>
                    <strong>{localStorage.getItem("Did")}</strong>
                  </>
                }
                type="info"
              />
            )}
            <NewApp />
            <ModalEditApp />
            <ModalAttachAuthorizedApp />
          </>
        ) : (
          <Result
            className="content-container"
            status="error"
            title="Unauthorized"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              Please go to&nbsp;
              <a href={walletWebClient} target="_blank" rel="noreferrer">
                {" "}
                wallet{" "}
              </a>
              &nbsp;and login with your credential before using this app.
            </div>
          </Result>
        )}
        <Footer style={{ textAlign: "center" }}>EBSI</Footer>
      </Layout>
    </AppProvider>
  );
}

export default App;
