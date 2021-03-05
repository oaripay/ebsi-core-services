import { ethers } from "ethers";
import crypto from "crypto";
import ganache from "ganache-core";
import {
  LedgerSCRegistry,
  LedgerSCRegistry__factory,
  SmartContractLib__factory,
  LedgerLib__factory,
} from "../../src/contracts/trusted-ledgers-sc";

interface LedgerInfoObject {
  ledgerName: string;
  ledgerInfo: unknown;
  serializedLedgerInfo: Buffer;
  ledgerInfoId: string;
}

interface LedgerInfoRevisionObject {
  ledgerName: string;
  ledgerInfo: unknown;
  serializedLedgerInfo: Buffer;
  revisionHash: string;
}

interface SmartContractInfoObject {
  smartContractName: string;
  smartContractInfo: unknown;
  serializedSmartContractInfo: Buffer;
  smartContractInfoId: string;
}

interface SmartContractInfoRevisionObject {
  smartContractName: string;
  smartContractInfo: unknown;
  serializedSmartContractInfo: Buffer;
  revisionHash: string;
}

export async function deployLedgerScRegistryContract(
  ethersProvider: ethers.providers.Web3Provider
): Promise<LedgerSCRegistry> {
  const owner = ethersProvider.getSigner();

  // Deploy libs
  const smartContractLibAddress = (
    await new SmartContractLib__factory(owner).deploy()
  ).address;

  const ledgerLibAddress = (await new LedgerLib__factory(owner).deploy())
    .address;

  /*
    https://docs.soliditylang.org/en/latest/using-the-compiler.html#library-linking

    "If your contracts use libraries, you will notice that the bytecode contains substrings of the
    form __$53aea86b7d70b31448b230b20ae141a537$__. These are placeholders for the actual library
    addresses. The placeholder is a 34 character prefix of the hex encoding of the keccak256 hash
    of the fully qualified library name. The bytecode file will also contain lines of the form
    // <placeholder> -> <fq library name> at the end to help identify which libraries the
    placeholders represent. Note that the fully qualified library name is the path of its source
    file and the library name separated by :."

    Example:

    ethers.utils.keccak256(
      Buffer.from("contracts/ledger-sc-registry/SmartContractLib.sol:SmartContractLib", "utf-8")
    )
    -> 0x2fedf458aaa0367c7238d1ce8cd0412607871c3249917176d0d80968ee3223b3

    Mapping:

    __$2fedf458aaa0367c7238d1ce8cd0412607$__ = "contracts/ledger-sc-registry/SmartContractLib.sol:SmartContractLib"
    __$aed295333e62715bf281536e462bb90727$__ = "contracts/ledger-sc-registry/LedgerLib.sol:LedgerLib"
  */

  const ledgerSCRegistry = await new LedgerSCRegistry__factory(
    {
      __$2fedf458aaa0367c7238d1ce8cd0412607$__: smartContractLibAddress,
      __$aed295333e62715bf281536e462bb90727$__: ledgerLibAddress,
    },
    owner
  ).deploy();

  return ledgerSCRegistry;
}

export async function insertLedgerInfo(
  contract: LedgerSCRegistry
): Promise<LedgerInfoObject> {
  const ledgerName = `ledger-${crypto.randomBytes(16).toString("hex")}`;
  const ledgerInfo = {
    "@context": "https://ebsi.com",
    type: "Ledger",
    name: ledgerName,
  };

  const serializedLedgerInfo = Buffer.from(JSON.stringify(ledgerInfo));

  await contract.insertLedgerInfo(ledgerName, serializedLedgerInfo);

  const ledgerInfoId = ethers.utils.sha256(serializedLedgerInfo);

  return {
    ledgerName,
    ledgerInfo,
    serializedLedgerInfo,
    ledgerInfoId,
  };
}

export async function insertLedgerInfoRevisions(
  contract: LedgerSCRegistry,
  ledgerInfoId: string
): Promise<LedgerInfoRevisionObject> {
  const ledgerName = `ledger-${crypto.randomBytes(16).toString("hex")}`;
  const ledgerInfo = {
    "@context": "https://ebsi.com",
    type: "Ledger",
    name: ledgerName,
    data: `data-${crypto.randomBytes(16).toString("hex")}`,
  };

  const serializedLedgerInfo = Buffer.from(JSON.stringify(ledgerInfo));

  await contract.updateLedgerInfoById(ledgerInfoId, serializedLedgerInfo);

  const revisionHash = ethers.utils.sha256(serializedLedgerInfo);

  return {
    ledgerName,
    ledgerInfo,
    serializedLedgerInfo,
    revisionHash,
  };
}

export async function insertSmartContractInfo(
  contract: LedgerSCRegistry
): Promise<SmartContractInfoObject> {
  const smartContractName = `sc-${crypto.randomBytes(16).toString("hex")}`;
  const smartContractInfo = {
    "@context": "https://ebsi.com",
    type: "SmartContract",
    name: smartContractName,
  };

  const serializedSmartContractInfo = Buffer.from(
    JSON.stringify(smartContractInfo)
  );

  await contract.insertSmartContractInfo(
    smartContractName,
    serializedSmartContractInfo
  );

  const smartContractInfoId = ethers.utils.sha256(serializedSmartContractInfo);

  return {
    smartContractName,
    smartContractInfo,
    serializedSmartContractInfo,
    smartContractInfoId,
  };
}

export async function insertSmartContractInfoRevisions(
  contract: LedgerSCRegistry,
  smartContractInfoId: string
): Promise<SmartContractInfoRevisionObject> {
  const smartContractName = `sc-${crypto.randomBytes(16).toString("hex")}`;
  const smartContractInfo = {
    "@context": "https://ebsi.com",
    type: "SmartContract",
    name: smartContractName,
    data: `data-${crypto.randomBytes(16).toString("hex")}`,
  };

  const serializedSmartContractInfo = Buffer.from(
    JSON.stringify(smartContractInfo)
  );

  await contract.updateSmartContractInfoById(
    smartContractInfoId,
    serializedSmartContractInfo
  );

  const revisionHash = ethers.utils.sha256(serializedSmartContractInfo);

  return {
    smartContractName,
    smartContractInfo,
    serializedSmartContractInfo,
    revisionHash,
  };
}

export interface SetupOptions {
  ledgersTotal?: number;
  ledgersRevisionsTotal?: number;
  smartContractsTotal?: number;
  smartContractsRevisionsTotal?: number;
}

export async function setupTestEnv(
  opts: SetupOptions = {
    ledgersTotal: 1,
    ledgersRevisionsTotal: 1,
    smartContractsTotal: 1,
    smartContractsRevisionsTotal: 1,
  }
): Promise<{
  provider: ethers.providers.Web3Provider;
  ledgerScRegistryContract: LedgerSCRegistry;
  ledgers: LedgerInfoObject[];
  ledgersRevisions: LedgerInfoRevisionObject[];
  smartContracts: SmartContractInfoObject[];
  smartContractsRevisions: SmartContractInfoRevisionObject[];
}> {
  const ethersProvider = new ethers.providers.Web3Provider(ganache.provider());

  // Deploy contract
  const ledgerScRegistryContract = await deployLedgerScRegistryContract(
    ethersProvider
  );

  // Insert fake data
  const ledgers = await Promise.all(
    Array(opts.ledgersTotal)
      .fill(0)
      .map(() => insertLedgerInfo(ledgerScRegistryContract))
  );

  // All the new revisions are added to the first ledgerInfo!
  const ledgersRevisions =
    opts.ledgersRevisionsTotal > 1
      ? await Promise.all(
          Array(opts.ledgersRevisionsTotal - 1)
            .fill(0)
            .map(() =>
              insertLedgerInfoRevisions(
                ledgerScRegistryContract,
                ledgers[0].ledgerInfoId
              )
            )
        )
      : [];

  const smartContracts = await Promise.all(
    Array(opts.smartContractsTotal)
      .fill(0)
      .map(() => insertSmartContractInfo(ledgerScRegistryContract))
  );

  const smartContractsRevisions =
    opts.smartContractsRevisionsTotal > 1
      ? await Promise.all(
          Array(opts.smartContractsRevisionsTotal - 1)
            .fill(0)
            .map(() =>
              insertSmartContractInfoRevisions(
                ledgerScRegistryContract,
                smartContracts[0].smartContractInfoId
              )
            )
        )
      : [];

  // Return test env variables
  return {
    provider: ethersProvider,
    ledgerScRegistryContract,
    ledgers,
    ledgersRevisions,
    smartContracts,
    smartContractsRevisions,
  };
}
