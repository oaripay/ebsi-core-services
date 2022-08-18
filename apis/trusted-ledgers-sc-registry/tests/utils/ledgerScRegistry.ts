import hre from "hardhat";
import { FactoryOptions } from "hardhat/types";
import "@nomiclabs/hardhat-ethers";
import { Contract, ethers } from "ethers";
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

const deployContract = async (
  name: string,
  opts: FactoryOptions = {}
): Promise<string> => {
  const factory = await hre.ethers.getContractFactory(name, opts);
  const contract = await factory.deploy();
  return contract.address;
};

export async function deployLedgerScRegistryContract(): Promise<{
  ledgerScRegistryContract: LedgerSCRegistry;
  policyContractMock: Contract;
}> {
  // mock trusted policies registry
  const testTprAddress = "0xb2a560271ce08135e245F490b8794794A13a1208";
  const policyRegistryFactory = await hre.ethers.getContractFactory(
    "PolicyRegistryMock"
  );
  const tempPolicyContract = await policyRegistryFactory.deploy();
  await tempPolicyContract.deployed();
  const bytecode = await hre.ethers.provider.getCode(
    tempPolicyContract.address
  );
  await hre.network.provider.send("hardhat_setCode", [
    testTprAddress,
    bytecode,
  ]);
  const policyContractMock = policyRegistryFactory.attach(testTprAddress);
  const ledgersScFactory = await hre.ethers.getContractFactory(
    "LedgerSCRegistry",
    {
      libraries: {
        LedgerLib: await deployContract("LedgerLib"),
        SmartContractLib: await deployContract("SmartContractLib"),
      },
    }
  );
  const ledgerScRegistryContract = await ledgersScFactory.deploy();
  await ledgerScRegistryContract.initialize(1);
  await ledgerScRegistryContract.setTrustedPoliciesRegistryAddress();
  await policyContractMock.setPolicyResult(true);

  return { ledgerScRegistryContract, policyContractMock };
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
  policyContractMock: Contract;
  ledgers: LedgerInfoObject[];
  ledgersRevisions: LedgerInfoRevisionObject[];
  smartContracts: SmartContractInfoObject[];
  smartContractsRevisions: SmartContractInfoRevisionObject[];
}> {
  const ethersProvider = hre.ethers.provider;

  // Deploy contract
  const { ledgerScRegistryContract, policyContractMock } =
    await deployLedgerScRegistryContract();

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
    policyContractMock,
    ledgers,
    ledgersRevisions,
    smartContracts,
    smartContractsRevisions,
  };
}
