import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import canonicalize from "canonicalize";
import { readdir, readFile } from "fs/promises";
import { SchemaSCRegistry } from "@ebsiint-sc/trusted-schemas-registry";

// follows ETH/BTC's BIP 39 protocol
// https://iancoleman.io/bip39/
// and matches the one hardhat uses when using { accounts: { mnemonic }}
task(
  "insertSchema",
  "Insert new schemas in TSR Contract ",
  async (
    taskArgs: { proxy: string },
    // eslint-disable-next-line @typescript-eslint/no-shadow
    { ethers }
  ) => {
    const [deployer, admin] = await ethers.getSigners();
    const tsr: SchemaSCRegistry = await ethers.getContractAt(
      "SchemaSCRegistry",
      taskArgs.proxy,
      admin
    );

    console.log(
      `deployer:${deployer.address}
     admin:${admin.address}`
    );
    const initialVersion = await tsr.version();
    console.log(initialVersion);
    console.log("initialVersion:", initialVersion.toString());

    const files = await readdir(`${__dirname}/../schemas/json-schemas`);

    const network = await ethers.provider.getNetwork();

    // eslint-disable-next-line no-restricted-syntax
    for (const file of files) {
      // eslint-disable-next-line no-continue
      if (file === ".git") continue;
      // eslint-disable-next-line no-await-in-loop
      const jsonFile = await readFile(
        `${__dirname}/../schemas/json-schemas/${file}`
      );
      const json = canonicalize(JSON.parse(jsonFile.toString()));

      const schema = ethers.utils.toUtf8Bytes(json);
      const schemaId = ethers.utils.sha256(schema);
      const schemaHex = `0x${Buffer.from(
        JSON.stringify(json),
        "utf-8"
      ).toString("hex")}`;

      // eslint-disable-next-line no-await-in-loop
      try {
        // eslint-disable-next-line no-await-in-loop
        await (await tsr.insertSchema(schemaId, schemaHex, schema)).wait(1);
        console.log(
          `Schema ${file} registered on networkId ${network.chainId} at id: ${schemaId}`
        );
      } catch (e) {
        console.log(
          `Schema ${file} already registered on networkId ${network.chainId} at id: ${schemaId}`
        );
      }
    }
  }
).addParam("proxy", "Proxy Address");
