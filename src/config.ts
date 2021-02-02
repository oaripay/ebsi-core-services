export const config = {
  PROVIDER: process.env.REACT_APP_PROVIDER || "http://127.0.0.1:8545",
  REGISTRY_ADDRESS:
    process.env.REACT_APP_REGISTRY_ADDRESS ||
    "0xC505fE2E1a87FdAA7a5fd2559C237848d3820e3d",
  NOTIFICATION_URL:
    process.env.REACT_APP_TAW_TX_URI || "/raw-transaction-signatures",
  REDIRECT_URL: process.env.REACT_APP_REDIRECT_URL || "http://localhost:3000",
  WALLET_WEB_CLIENT_URL:
    process.env.REACT_APP_WALLET_WEB_CLIENT_URL ||
    "https://app.intebsi.xyz/wallet/notifications",
  EBSI_API:
    process.env.REACT_APP_WALLET_API || "https://api.intebsi.xyz/wallet/v1",
};
