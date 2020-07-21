export const config = {
  PROVIDER: process.env.REACT_APP_PROVIDER || "https://www.intebsi.xyz/jsonrpc",
  REGISTRY_ADDRESS:
    process.env.REACT_APP_REGISTRY_ADDRESS ||
    "0x58078a7A356D32d00dc35059CAe41601127E0Cc1",
  NOTIFICATION_URL:
    process.env.REACT_APP_TAW_TX_URI || "/raw-transaction-signatures",
  REDIRECT_URL: process.env.REACT_APP_REDIRECT_URL || "http://localhost:3000",
  WALLET_WEB_CLIENT_URL:
    process.env.REACT_APP_WALLET_WEB_CLIENT_URL ||
    "https://app.intebsi.xyz/wallet/notifications",
  EBSI_API:
    process.env.REACT_APP_WALLET_API || "https://api.intebsi.xyz/wallet/v1",
};
