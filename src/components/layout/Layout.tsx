import React from "react";
import PropTypes from "prop-types";
import { GlobalBanner } from "../../ui-components/global-banner/GlobalBanner";
import { SiteHeader } from "../../ui-components/site-header/SiteHeader";
import { Footer } from "../../ui-components/footer/Footer";

export interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <GlobalBanner />
      <SiteHeader
        logged={false}
        loginToggle={{}}
        loginBox={{}}
        menu={{
          title: "Menu",
          close: "Close",
          siteName: "EBSI Users Onboarding Service v2",
          menuLink: "/",
          items: [],
        }}
      />
      {children}
      <Footer />
    </>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;
