import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";

import type { PolicyRegistry } from "../src/types/index.js";

task("grantRole", "add new operator on Trusted Policy Registry")
  .addParam("proxy", "The proxy address of tpr")
  .addParam("operator", "The address of the operator")
  .setAction(
    async (taskArgs: { operator: string; proxy: string }, { ethers }) => {
      const proxyDeployedAddr = taskArgs.proxy;
      // get contract
      const trustedPolicyRegistry = (await ethers.getContractAt(
        "PolicyRegistry",
        proxyDeployedAddr,
      )) as PolicyRegistry;
      const operatorRole = await trustedPolicyRegistry.OPERATOR_ROLE();
      // grant role
      await (
        await trustedPolicyRegistry.grantRole(operatorRole, taskArgs.operator)
      ).wait(1);
      // check role
      const hasRoleOperator = await trustedPolicyRegistry.hasRole(
        operatorRole,
        taskArgs.operator,
      );
      if (hasRoleOperator) {
        console.log(
          `Operator Role with id ${operatorRole} granted to ${taskArgs.operator}`,
        );
      }
    },
  );
