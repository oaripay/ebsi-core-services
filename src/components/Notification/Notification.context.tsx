import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { notification, Row, Space, Spin } from "antd";

type NotificationContextType = {
  showPendingTxNotif: boolean;
  setShowPendingTxNotif: (show: boolean) => void;
};

export const NotificationContext = createContext<NotificationContextType>({
  showPendingTxNotif: false,
  setShowPendingTxNotif: () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [showPendingTxNotif, setShowPendingTxNotif] = useState(false);

  useEffect(() => {
    if (showPendingTxNotif) {
      notification.info({
        message: `Transaction in pending`,
        placement: "bottomRight",
        key: "pendingTx",
        duration: 0,
        description: (
          <Row align="middle">
            <Space>
              <Spin />
              <span>Please wait for transaction to be mined</span>
            </Space>
          </Row>
        ),
      });
      return;
    }
    notification.close("pendingTx");
  }, [showPendingTxNotif]);

  return (
    <NotificationContext.Provider
      value={{
        showPendingTxNotif,
        setShowPendingTxNotif,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationContextType {
  return useContext(NotificationContext);
}
