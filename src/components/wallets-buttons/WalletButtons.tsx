import React from "react";
import { Button } from "../../ui-components/button/Button";
import { wallets } from "../../types";

type Props = {
  setWalletOption: (option: wallets.default) => void;
};

export const WalletButtons: React.FunctionComponent<Props> = ({
  setWalletOption,
}: Props) => {
  const onSelect = (option: wallets.default) => {
    setWalletOption(option);
  };

  return (
    <div className="ecl-container wallet-buttons">
      <Button
        variant="secondary"
        type="button"
        onClick={() => onSelect(wallets.default.DESKTOP)}
        label="Desktop Wallet"
        className="wallet-button"
      />
      <Button
        variant="primary"
        type="button"
        onClick={() => onSelect(wallets.default.MOBILE)}
        label="Mobile Wallet"
        className="wallet-button"
      />
      <Button
        variant="call"
        type="button"
        onClick={() => onSelect(wallets.default.EBSI_WALLET)}
        label="EBSI Web Wallet"
        className="wallet-button"
      />
    </div>
  );
};

export default WalletButtons;
