import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { useEthersHook } from "../../hooks/use-ethers.hook";
import { useWalletContext } from "../../components/Wallet/WalletContext";
import { getIdentifierFromWalletAddr } from "./DidUtils";

export type DidRecordDataType = {};

export default function useDidRegisterEffects() {
  const { didRegistryContract } = useEthersHook();
  const { walletAddress } = useWalletContext();
  const { provider } = useEthersHook();
  const [loading, setLoading] = useState(true);
  const [networkId, setNetworkId] = useState(0);
  const [publicKey, setPublicKey] = useState("");
  const [didDefined, setDidDefined] = useState(false);
  const [didRecord, setDidRecord] = useState<DidRecordDataType>({});
  const [didAsAdministrator, setDidAsAdministrator] = useState(false);

  useEffect(() => {
    if (!provider) {
      return;
    }
    provider
      .getNetwork()
      .then((network) => {
        setNetworkId(network.chainId);
      })
      .then(() => {
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [provider]);

  useEffect(() => {
    const pbKeyFromLocalStorage: any = localStorage.getItem("did-public-key");
    const pbKeyParsed = pbKeyFromLocalStorage
      ? JSON.parse(pbKeyFromLocalStorage)
      : {};

    if (walletAddress && provider) {
      const publicKeyForAccount = pbKeyParsed ? pbKeyParsed[walletAddress] : "";

      if (!publicKeyForAccount) {
        const hash = ethers.utils.keccak256(walletAddress);
        provider
          .getSigner()
          .signMessage(hash)
          .then((signature) => {
            const {
              recoverPublicKey,
              arrayify,
              hashMessage,
              computePublicKey,
            } = ethers.utils;
            const pubKey = computePublicKey(
              recoverPublicKey(arrayify(hashMessage(hash)), signature),
              true
            );
            localStorage.setItem(
              "did-public-key",
              JSON.stringify({
                [walletAddress]: pubKey,
              })
            );
            setPublicKey(pubKey);
          });
      }
    }
  }, [walletAddress, provider]);

  useEffect(() => {
    const publicKeyFromLocalStorage = localStorage.getItem("did-public-key");
    if (publicKeyFromLocalStorage && walletAddress) {
      try {
        setPublicKey(JSON.parse(publicKeyFromLocalStorage)[walletAddress]);
      } catch (ex) {
        //
      }
    }
  }, [walletAddress]);

  useEffect(() => {
    if (!didRegistryContract || !walletAddress) {
      return;
    }
    didRegistryContract
      .getAdministrator(getIdentifierFromWalletAddr(walletAddress))
      .then(() => {
        setDidAsAdministrator(true);
      })
      .catch(() => {
        setDidAsAdministrator(false);
      });
  }, [didRegistryContract, walletAddress]);

  useEffect(() => {
    if (!didRegistryContract || !walletAddress) {
      return;
    }
    const didEbsi = getIdentifierFromWalletAddr(walletAddress);

    didRegistryContract
      .getDidRecord(`0x${Buffer.from(didEbsi).toString("hex")}`)
      .then((didRecordData: DidRecordDataType) => {
        setDidRecord(didRecordData);
        setDidDefined(true);
      })
      .catch(() => {
        setDidDefined(false);
      });
  }, [didRegistryContract, walletAddress]);

  return {
    networkId,
    loading,
    publicKey,
    walletAddress,
    didDefined,
    didAsAdministrator,
    didRecord,
  };
}
