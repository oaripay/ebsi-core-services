export const config = {
  PROVIDER: process.env.REACT_APP_PROVIDER || "http://127.0.0.1:7545",
  REGISTRY_ADDRESS:
    process.env.REACT_APP_REGISTRY_ADDRESS ||
    "0x59727673f2426A6C68E09511C0B0422ab512d413",
  NOTIFICATION_URL:
    process.env.REACT_APP_TAW_TX_URI || "/raw-transaction-signatures",
  REDIRECT_URL: process.env.REACT_APP_REDIRECT_URL || "http://localhost:3000",
  WALLET_WEB_CLIENT_URL:
    process.env.REACT_APP_WALLET_WEB_CLIENT_URL ||
    "https://app.intebsi.xyz/wallet/notifications",
  EBSI_API:
    process.env.REACT_APP_WALLET_API || "https://api.intebsi.xyz/wallet/v1",
};
