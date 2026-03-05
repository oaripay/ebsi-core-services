import { ethers } from "hardhat";

export default async function deployContract(name: string, args?: unknown[]) {
  const factory = await ethers.getContractFactory(name);
  const ctr = await factory.deploy(...(args ?? []));
  await ctr.waitForDeployment();

  return ctr;
}
