import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { ethers } from "ethers";
import crypto from "crypto";
import { LedgerSCRegistry } from "../../src/contracts";

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

export async function deployLedgerScRegistryContract(): Promise<LedgerSCRegistry> {
  // Deploy libs
  const ledgerLibFactory = await hre.ethers.getContractFactory("LedgerLib");
  const ledgerLib = await ledgerLibFactory.deploy();

  const smartContractLibFactory = await hre.ethers.getContractFactory(
    "SmartContractLib"
  );
  const smartContractLib = await smartContractLibFactory.deploy();

  const ledgersScFactory = await hre.ethers.getContractFactory(
    "LedgerSCRegistry",
    {
      libraries: {
        LedgerLib: ledgerLib.address,
        SmartContractLib: smartContractLib.address,
      },
    }
  );
  const ledgersScRegistry = await ledgersScFactory.deploy();

  await ledgersScRegistry.initialize(1);

  return ledgersScRegistry;
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
  provider: ethers.providers.JsonRpcProvider;
  ledgerScRegistryContract: LedgerSCRegistry;
  ledgers: LedgerInfoObject[];
  ledgersRevisions: LedgerInfoRevisionObject[];
  smartContracts: SmartContractInfoObject[];
  smartContractsRevisions: SmartContractInfoRevisionObject[];
}> {
  const ethersProvider = hre.ethers.provider;

  // Deploy contract
  const ledgerScRegistryContract = await deployLedgerScRegistryContract();

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
