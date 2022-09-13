import { ethers, network } from "hardhat";
import { expect } from "chai";
import { DidRegistry } from "../src/types";
import { testTprAddress } from "./testAddress";

describe("Did Documents", () => {
  let ts: DidRegistry;

  before(async () => {
    const policyRegistryFactory = await ethers.getContractFactory(
      "PolicyRegistryMock"
    );
    const tempPolicyContract = await policyRegistryFactory.deploy();
    await tempPolicyContract.deployed();
    const bytecode = await ethers.provider.getCode(tempPolicyContract.address);
    await network.provider.send("hardhat_setCode", [testTprAddress, bytecode]);
    const policyContractMock = policyRegistryFactory.attach(testTprAddress);
    await policyContractMock.setPolicyResult(true);
  });

  beforeEach(async () => {
    const didDocumentFactory = await ethers.getContractFactory(
      "DidDocumentLib"
    );
    const didDocumentLib = await didDocumentFactory.deploy();

    const contractFactory = await ethers.getContractFactory("DidRegistry", {
      libraries: {
        DidDocumentLib: didDocumentLib.address,
      },
    });

    ts = (await contractFactory.deploy()) as DidRegistry;

    await ts.initialize(42);
    await ts.setTrustedPoliciesRegistryAddress();
    const initialVersion = await ts.version();
    expect(initialVersion).to.equal(42);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(ts.address).to.be.properAddress;
  });

  it("should work", async () => {
    await ts.setTrustedPoliciesRegistryAddress();
  });
});
