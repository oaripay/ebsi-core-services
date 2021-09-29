import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { useEthersHook } from "../../hooks/use-ethers.hook";
import { useWalletContext } from "../../components/Wallet/WalletContext";
import { DidRecordType } from "./DidTableTypes";

const PB_KEY_LS = "did-public-key";

export default function useDidRegisterEffects({
  identifier,
}: {
  identifier: string;
}) {
  const { didRegistryContract } = useEthersHook();
  const { walletAddress } = useWalletContext();
  const { provider } = useEthersHook();
  const [loading, setLoading] = useState(true);
  const [networkId, setNetworkId] = useState(0);
  const [publicKey, setPublicKey] = useState("");
  const [didDefined, setDidDefined] = useState(false);
  const [didRecord, setDidRecord] = useState<DidRecordType>({});
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
    const pbKeyFromLocalStorage: any = localStorage.getItem(PB_KEY_LS);
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
              PB_KEY_LS,
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
    const publicKeyFromLocalStorage = localStorage.getItem(PB_KEY_LS);
    if (publicKeyFromLocalStorage && walletAddress) {
      try {
        setPublicKey(JSON.parse(publicKeyFromLocalStorage)[walletAddress]);
      } catch (ex) {
        //
      }
    }
  }, [walletAddress]);

  useEffect(() => {
    if (!didRegistryContract || !identifier) {
      return;
    }
    didRegistryContract
      .getAdministrator(identifier)
      .then(() => {
        setDidAsAdministrator(true);
      })
      .catch(() => {
        setDidAsAdministrator(false);
      });
  }, [didRegistryContract, identifier]);

  useEffect(() => {
    if (!didRegistryContract || !identifier) {
      return;
    }

    didRegistryContract
      .getDidRecord(`0x${Buffer.from(identifier).toString("hex")}`)
      .then((didRecordData: DidRecordType) => {
        setDidRecord(didRecordData);
        setDidDefined(true);
      })
      .catch(() => {
        setDidDefined(false);
      });
  }, [didRegistryContract, identifier]);

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
