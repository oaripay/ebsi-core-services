import { ethers } from "hardhat";
import type { ContractFactory } from "@ethersproject/contracts";
import type { Contract } from "ethers";

export default async function deployContract(
  name: string,
  args?: Array<unknown>
): Promise<Contract> {
  const factory: ContractFactory = await ethers.getContractFactory(name);
  const ctr = await factory.deploy(...(args || []));
  await ctr.deployed();

  return ctr;
}
