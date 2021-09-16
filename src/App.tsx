import React, { useEffect, useState } from "react";

import "./App.less";
import { Layout } from "antd";
import { BrowserRouter as Router } from "react-router-dom";

import detectEthereumProvider from "@metamask/detect-provider";
import BodyComponents from "./BodyComponents";
import Header from "./components/Header/Header";
import Menu from "./components/Menu/Menu";
import { MenuProvider } from "./components/Menu/Menu.context";
import { AppProvider } from "./AppContext";
import { WalletProvider } from "./components/Wallet/WalletContext";

function App() {
  const [hasProvider, setHasProvider] = useState(false);
  const Window: any = window;
  useEffect(() => {
    detectEthereumProvider().then((provider: any) => {
      /* eslint no-underscore-dangle: 0 */
      provider._metamask.isUnlocked().then((r: any) => setHasProvider(r));
    });
  }, [Window]);
  if (!hasProvider) {
    return (
      <MenuProvider>
        <Layout style={{ minHeight: "100vh" }}>
          <span>
            Provider not detected or metamask is unlocked. Please unlock
            metamask and then refresh the page.
          </span>
        </Layout>
      </MenuProvider>
    );
  }
  return (
    <MenuProvider>
      <AppProvider>
        <WalletProvider>
          <Header />
          <Router>
            <Layout style={{ minHeight: "100vh" }}>
              <Menu />
              <BodyComponents />
            </Layout>
          </Router>
        </WalletProvider>
      </AppProvider>
    </MenuProvider>
  );
}

export default App;
