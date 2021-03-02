export const config = {
  PROVIDER:
    process.env.REACT_APP_PROVIDER ||
    "https://api.test.intebsi.xyz/ledger/v1/blockchains/besu",
  REGISTRY_ADDRESS:
    process.env.REACT_APP_REGISTRY_ADDRESS ||
    "0x4d06b562588cb61616959806726c5d9f060b0f21",
  NOTIFICATION_URL:
    process.env.REACT_APP_TAW_TX_URI || "/raw-transaction-signatures",
  REDIRECT_URL: process.env.REACT_APP_REDIRECT_URL || "http://localhost:3000",
  WALLET_WEB_CLIENT_URL:
    process.env.REACT_APP_WALLET_WEB_CLIENT_URL ||
    "https://app.intebsi.xyz/wallet/notifications",
  EBSI_API:
    process.env.REACT_APP_WALLET_API || "https://api.intebsi.xyz/wallet/v1",
};
