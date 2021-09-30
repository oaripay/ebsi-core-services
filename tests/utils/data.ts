import { EbsiWallet } from "@cef-ebsi/wallet-lib";

export const createDid = (): string => EbsiWallet.createDid();

export default createDid;
