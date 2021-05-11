/**
 * Top-level message component
 */

import React, {
  useContext,
  useEffect,
  createContext,
  useState,
  useCallback,
} from "react";
import PropTypes from "prop-types";
import { useLocation, useHistory } from "react-router-dom";

const messageTypes = ["error", "info", "success", "warning"] as const;

export type MessageType = typeof messageTypes[number];

export interface AppMessage {
  type: MessageType;
  title: React.ReactNode;
  message: React.ReactNode;
  isDisplayed?: boolean;
}

export interface AppMessageContext {
  message: AppMessage;
  hideMessage: () => void;
  displayMessage: (message: AppMessage) => void;
}

const defaultAppMessage: AppMessage = {
  type: "info",
  title: "",
  message: "",
  isDisplayed: false,
};

const defaultAppMessageContext: AppMessageContext = {
  message: defaultAppMessage,
  hideMessage: () => null,
  displayMessage: () => null,
};

const appMessageContext = createContext<AppMessageContext>(
  defaultAppMessageContext
);

export function useProvideAppMessage(): AppMessageContext {
  const { pathname } = useLocation();
  const { action } = useHistory();
  const [appMessage, setAppMessage] = useState<AppMessage>(defaultAppMessage);

  const hideMessage = useCallback(() => {
    setAppMessage({ ...appMessage, isDisplayed: false });
  }, [appMessage]);

  const displayMessage = useCallback((message: AppMessage) => {
    setAppMessage({
      isDisplayed: true,
      ...message,
    });
  }, []);

  // Only execute when pathname changes
  useEffect(() => {
    // Don't hide message if the user was redirected (REPLACE)
    if (appMessage.isDisplayed && action !== "REPLACE") {
      hideMessage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return {
    message: appMessage,
    hideMessage,
    displayMessage,
  };
}

export interface ProvideAppMessageProps {
  children: React.ReactNode;
}

export const ProvideAppMessage: React.FC<ProvideAppMessageProps> = ({
  children,
}) => {
  const appMessage = useProvideAppMessage();
  return (
    <appMessageContext.Provider value={appMessage}>
      {children}
    </appMessageContext.Provider>
  );
};

ProvideAppMessage.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useAppMessage(): AppMessageContext {
  return useContext(appMessageContext);
}
