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
    <>
      <Button
        variant="primary"
        type="button"
        onClick={() => onSelect(wallets.default.DESKTOP)}
        label="Desktop Wallet"
        className="ecl-u-mr-m ecl-u-mb-s"
      />
      <Button
        variant="secondary"
        type="button"
        onClick={() => onSelect(wallets.default.MOBILE)}
        label="Mobile Wallet"
        className="ecl-u-mr-m ecl-u-mb-s"
      />
      <Button
        variant="secondary"
        type="button"
        // Not implemented yet
        // onClick={() => onSelect(wallets.default.EBSI_WALLET)}
        label="EBSI Web Wallet"
        className="ecl-u-mr-m ecl-u-mb-s"
        disabled
      />
    </>
  );
};

export default WalletButtons;
