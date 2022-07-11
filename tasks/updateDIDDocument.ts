import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import { DidRegistry } from "../src/types";

// follows ETH/BTC's BIP 39 protocol
// https://iancoleman.io/bip39/
// and matches the one hardhat uses when using { accounts: { mnemonic }}
task(
  "updateDidDocument",
  "Update existing did in DID Contract ",
  async (
    taskArgs: { proxy: string; did: string; metadata: string },
    // eslint-disable-next-line @typescript-eslint/no-shadow
    { ethers }
  ) => {
    const [deployer, admin] = await ethers.getSigners();
    const did: DidRegistry = (await ethers.getContractAt(
      "DidRegistry",
      taskArgs.proxy,
      admin
    )) as DidRegistry;

    console.log(
      `deployer:${deployer.address}
     admin:${admin.address}`
    );
    const initialVersion = await did.version();
    console.log(initialVersion);
    console.log("initialVersion:", initialVersion.toString());

    // const network = await ethers.provider.getNetwork();

    try {
      await (
        await did.insertDidController(
          ethers.utils.toUtf8Bytes(taskArgs.did),
          admin.address,
          Date.now(),
          Date.now()
        )
      ).wait(1);
      console.log("controller inserted");
      await (
        await did.updateDidDocument(
          ethers.utils.toUtf8Bytes(taskArgs.did),
          ethers.BigNumber.from(1),
          ethers.utils.sha256(ethers.utils.toUtf8Bytes(taskArgs.metadata)),
          ethers.utils.toUtf8Bytes(taskArgs.metadata),
          ethers.utils.randomBytes(32),
          ethers.utils.toUtf8Bytes(taskArgs.metadata)
        )
      ).wait(1);
      const didDocument = await did.getLatestDidDocumentVersion(
        ethers.utils.toUtf8Bytes(taskArgs.did)
      );
      console.log(Buffer.from(didDocument, "hex").toString("utf-8"));
    } catch (e) {
      console.log(e);
    }

    // const json = canonicalize(JSON.parse(jsonFile.toString()));
    // const schema = ethers.utils.toUtf8Bytes(json);
    // const schemaHex = `0x${Buffer.from(JSON.stringify(json), "utf-8").toString(
    //   "hex"
    // )}`;
    //
    // try {
    //   await (await tsr.updateSchema(taskArgs.schema, schemaHex, schema)).wait(
    //     1
    //   );
    //   console.log(
    //     `Schema ${taskArgs.file} updated on networkId ${network.chainId} at id: ${taskArgs.schema}`
    //   );
    // } catch (e) {
    //   console.log(
    //     `There is no schema ${taskArgs.file} registered on networkId ${network.chainId} at id: ${taskArgs.schema}`
    //   );
    // }
  }
)
  .addParam("proxy", "Proxy Address")
  .addParam("did", "Did id (did:ebsi:didid)")
  .addParam("metadata", "Did Document Metadata");
