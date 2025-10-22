import { task } from "hardhat/config";

import { Settings } from "../utils/settings";

task(
  "trustedContractsRegistry",
  "Deploy Trusted Contracts Registry (ProxyTemplateRegistry and ProxyFactory)",
)
  .addParam("didregistry", "The address of DID Registry")
  .addParam("policyregistry", "The address of Policy Registry")
  .addParam(
    "suffix",
    "the suffix name of the contract for the deployment",
    "EBSI",
  )
  .setAction(
    async (
      taskArgs: {
        didregistry: string;
        policyregistry: string;
        suffix: string;
      },
      { ethers, network, run, upgrades },
    ) => {
      // compile
      await run("compile", { quiet: true });
      const fileName =
        taskArgs.suffix === "EBSI"
          ? "trusted-contracts-registry"
          : `trusted-contracts-registry-${taskArgs.suffix}`;

      const settings = new Settings(fileName, network.name);

      // Deploy ProxyTemplateRegistry
      console.log("Deploying ProxyTemplateRegistry...");
      const ProxyTemplateRegistry = await ethers.getContractFactory(
        "ProxyTemplateRegistry",
      );
      const proxyTemplateRegistry = await upgrades.deployProxy(
        ProxyTemplateRegistry,
        [taskArgs.policyregistry],
      );
      await proxyTemplateRegistry.waitForDeployment();
      const templateRegistryAddress = await proxyTemplateRegistry.getAddress();
      console.log(
        `ProxyTemplateRegistry deployed to ${templateRegistryAddress}`,
      );

      // Deploy ProxyFactory
      console.log("Deploying ProxyFactory...");
      const ProxyFactory = await ethers.getContractFactory("ProxyFactory");
      const proxyFactory = await upgrades.deployProxy(ProxyFactory, [
        templateRegistryAddress,
        taskArgs.didregistry,
        taskArgs.policyregistry,
      ]);
      await proxyFactory.waitForDeployment();
      const proxyFactoryAddress = await proxyFactory.getAddress();
      console.log(`ProxyFactory deployed to ${proxyFactoryAddress}`);

      // Save addresses to settings
      settings.set("proxyTemplateRegistryAddress", templateRegistryAddress);
      settings.set("proxyFactoryAddress", proxyFactoryAddress);
      settings.set("didRegistryAddress", taskArgs.didregistry);
      settings.set("policyRegistryAddress", taskArgs.policyregistry);

      console.log("\nDeployment Summary:");
      console.log(`  ProxyTemplateRegistry: ${templateRegistryAddress}`);
      console.log(`  ProxyFactory: ${proxyFactoryAddress}`);
      console.log(`  DID Registry: ${taskArgs.didregistry}`);
      console.log(`  Policy Registry: ${taskArgs.policyregistry}`);
    },
  );

task(
  "trustedContractsRegistryUpgrade",
  "Upgrade Trusted Contracts Registry contracts",
)
  .addParam("contract", "Contract to upgrade (templateRegistry or factory)")
  .addParam(
    "suffix",
    "the suffix name of the contract for the deployment",
    "EBSI",
  )
  .setAction(
    async (
      taskArgs: {
        contract: string;
        suffix: string;
      },
      { ethers, network, run, upgrades },
    ) => {
      await run("compile", { force: true });

      const fileName =
        taskArgs.suffix === "EBSI"
          ? "trusted-contracts-registry"
          : `trusted-contracts-registry-${taskArgs.suffix}`;
      const settings = new Settings(fileName, network.name);

      if (taskArgs.contract === "templateRegistry") {
        const proxyAddress = settings.mustGet("proxyTemplateRegistryAddress");
        console.log(`Upgrading ProxyTemplateRegistry at ${proxyAddress}...`);

        const ProxyTemplateRegistry = await ethers.getContractFactory(
          "ProxyTemplateRegistry",
        );
        const upgraded = await upgrades.upgradeProxy(
          proxyAddress,
          ProxyTemplateRegistry,
          { redeployImplementation: "always" },
        );

        console.log(
          `ProxyTemplateRegistry upgraded to implementation ${await upgraded.getAddress()}`,
        );
      } else if (taskArgs.contract === "factory") {
        const proxyAddress = settings.mustGet("proxyFactoryAddress");
        console.log(`Upgrading ProxyFactory at ${proxyAddress}...`);

        const ProxyFactory = await ethers.getContractFactory("ProxyFactory");
        const upgraded = await upgrades.upgradeProxy(
          proxyAddress,
          ProxyFactory,
          { redeployImplementation: "always" },
        );

        console.log(
          `ProxyFactory upgraded to implementation ${await upgraded.getAddress()}`,
        );
      } else {
        throw new Error(
          'Invalid contract parameter. Use "templateRegistry" or "factory"',
        );
      }
    },
  );

task(
  "updateTrustedContractsRegistry",
  "Update configuration of existing Trusted Contracts Registry deployments",
)
  .addParam("contract", "Contract to update (templateRegistry or factory)")
  .addParam("action", "Action to perform (setPolicyRegistry or setDidRegistry)")
  .addParam("address", "New address to set")
  .addParam(
    "suffix",
    "the suffix name of the contract for the deployment",
    "EBSI",
  )
  .setAction(
    async (
      taskArgs: {
        action: string;
        address: string;
        contract: string;
        suffix: string;
      },
      { ethers, network, run },
    ) => {
      await run("compile", { quiet: true });

      const fileName =
        taskArgs.suffix === "EBSI"
          ? "trusted-contracts-registry"
          : `trusted-contracts-registry-${taskArgs.suffix}`;
      const settings = new Settings(fileName, network.name);

      if (taskArgs.contract === "templateRegistry") {
        const registryAddress = settings.mustGet(
          "proxyTemplateRegistryAddress",
        );
        console.log(`Updating ProxyTemplateRegistry at ${registryAddress}...`);

        const registry = await ethers.getContractAt(
          "ProxyTemplateRegistry",
          registryAddress,
        );

        if (taskArgs.action === "setPolicyRegistry") {
          console.log(`Setting Policy Registry to ${taskArgs.address}...`);
          const tx = await registry.setPolicyRegistry(taskArgs.address);
          await tx.wait();

          // Update settings
          settings.set("policyRegistryAddress", taskArgs.address);

          console.log("Policy Registry updated successfully!");
        } else {
          throw new Error(
            `Invalid action for templateRegistry. Use "setPolicyRegistry"`,
          );
        }
      } else if (taskArgs.contract === "factory") {
        const factoryAddress = settings.mustGet("proxyFactoryAddress");
        console.log(`Updating ProxyFactory at ${factoryAddress}...`);

        const factory = await ethers.getContractAt(
          "ProxyFactory",
          factoryAddress,
        );

        if (taskArgs.action === "setDidRegistry") {
          console.log(`Setting DID Registry to ${taskArgs.address}...`);
          const tx = await factory.setDidRegistry(taskArgs.address);
          await tx.wait();

          // Update settings
          settings.set("didRegistryAddress", taskArgs.address);

          console.log("DID Registry updated successfully!");
        } else if (taskArgs.action === "setPolicyRegistry") {
          console.log(`Setting Policy Registry to ${taskArgs.address}...`);

          // Note: ProxyFactory doesn't have setPolicyRegistry,
          // it's set during initialization only
          throw new Error(
            "ProxyFactory does not support updating Policy Registry. Redeploy required.",
          );
        } else {
          throw new Error(`Invalid action for factory. Use "setDidRegistry"`);
        }
      } else {
        throw new Error(
          'Invalid contract parameter. Use "templateRegistry" or "factory"',
        );
      }
    },
  );

task(
  "addTemplate",
  "Add a template to ProxyTemplateRegistry (optionally deploy mock beacon)",
)
  .addParam("registry", "The address of ProxyTemplateRegistry")
  .addParam("name", "Template name")
  .addParam("templateversion", "Template version")
  .addOptionalParam(
    "beacon",
    "Beacon address (if not provided, will deploy SampleUpgradeableBeacon)",
  )
  .addOptionalParam(
    "implementation",
    "Implementation address (only if beacon not provided)",
  )
  .addOptionalParam(
    "repouri",
    "Repository URI",
    "https://github.com/example/repo",
  )
  .addOptionalParam("audituri", "Audit URI", "https://audit.example.com/report")
  .addParam(
    "suffix",
    "the suffix name of the contract for the deployment",
    "EBSI",
  )
  .setAction(
    async (
      taskArgs: {
        audituri: string;
        beacon?: string;
        implementation?: string;
        name: string;
        registry: string;
        repouri: string;
        suffix: string;
        templateversion: string;
      },
      { ethers, network, run },
    ) => {
      await run("compile", { quiet: true });

      const fileName =
        taskArgs.suffix === "EBSI"
          ? "trusted-contracts-registry"
          : `trusted-contracts-registry-${taskArgs.suffix}`;
      const settings = new Settings(fileName, network.name);

      let beaconAddress = taskArgs.beacon;

      // If beacon not provided, deploy mock beacon and implementation
      if (!beaconAddress) {
        console.log("No beacon provided, deploying SampleUpgradeableBeacon...");

        let implementationAddress = taskArgs.implementation;

        // Deploy implementation if not provided
        if (!implementationAddress) {
          console.log("Deploying SampleImplementation...");
          const SampleImplementation = await ethers.getContractFactory(
            "SampleImplementation",
          );
          const implementation = await SampleImplementation.deploy();
          await implementation.waitForDeployment();
          implementationAddress = await implementation.getAddress();
          console.log(
            `SampleImplementation deployed to ${implementationAddress}`,
          );
        }

        // Deploy beacon
        const SampleBeacon = await ethers.getContractFactory(
          "SampleUpgradeableBeacon",
        );
        const beacon = await SampleBeacon.deploy(implementationAddress);
        await beacon.waitForDeployment();
        beaconAddress = await beacon.getAddress();
        console.log(`SampleUpgradeableBeacon deployed to ${beaconAddress}`);

        // Save beacon address
        settings.set(
          `beacon_${taskArgs.name}_${taskArgs.templateversion}`,
          beaconAddress,
        );
        settings.set(
          `implementation_${taskArgs.name}_${taskArgs.templateversion}`,
          implementationAddress,
        );
      }

      // Get the registry contract
      const registry = await ethers.getContractAt(
        "ProxyTemplateRegistry",
        taskArgs.registry,
      );

      // Compute init selector for initialize(string,string,address,bytes32)
      const initSelector = ethers
        .keccak256(
          ethers.toUtf8Bytes("initialize(string,string,address,bytes32)"),
        )
        .slice(0, 10);

      // Create dummy hashes for testing (in production these should be real)
      const contractHash = ethers.keccak256(
        ethers.toUtf8Bytes("contract_code"),
      );
      const storageLayoutHash = ethers.keccak256(
        ethers.toUtf8Bytes("storage_layout"),
      );

      // Prepare template struct
      const template = {
        auditURI: taskArgs.audituri,
        beaconAddress: beaconAddress,
        contractHash: contractHash,
        initSelector: initSelector,
        isActive: true,
        name: taskArgs.name,
        repoURI: taskArgs.repouri,
        storageLayoutHash: storageLayoutHash,
        version: taskArgs.templateversion,
      };

      console.log("\nAdding template to registry...");
      console.log(`  Name: ${taskArgs.name}`);
      console.log(`  Version: ${taskArgs.templateversion}`);
      console.log(`  Beacon: ${beaconAddress}`);

      const tx = await registry.addTemplate(template);
      await tx.wait();

      const templateId = await registry.computeTemplateId(
        taskArgs.name,
        taskArgs.templateversion,
      );
      console.log(`\nTemplate added successfully!`);
      console.log(`  Template ID: ${templateId}`);

      // Save template ID
      settings.set(
        `templateId_${taskArgs.name}_${taskArgs.templateversion}`,
        templateId,
      );
    },
  );
