import React from "react";

import "./App.css";
import { Col, Layout, Row, Typography } from "antd";

import { AppProvider } from "./AppContext";
import BodyComponents from "./BodyComponents";

const { Header, Footer } = Layout;
const { Title } = Typography;

function App() {
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
        <>
          <BodyComponents />
        </>
        <Footer style={{ textAlign: "center" }}>EBSI</Footer>
      </Layout>
    </AppProvider>
  );
}

export default App;
