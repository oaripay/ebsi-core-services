import { ethers } from "ethers";
import ganache from "ganache-core";
import {
  Timestamp,
  Timestamp__factory,
  RecordLib__factory,
  HashAlgoLib__factory,
  TimestampLib__factory,
  StringManip__factory,
} from "../../src/contracts/timestamp";

export async function deployTimestampContract(
  ethersProvider: ethers.providers.Web3Provider
): Promise<Timestamp> {
  const owner = ethersProvider.getSigner();

  // Deploy libs
  const stringManipLibAddress = (await new StringManip__factory(owner).deploy())
    .address;

  const recordLibAddress = (
    await new RecordLib__factory(
      {
        __$8147b76a27e37c94a969b90d63cdae8dcb$__: stringManipLibAddress,
      },
      owner
    ).deploy()
  ).address;

  const hashAlgoLibAddress = (await new HashAlgoLib__factory(owner).deploy())
    .address;

  const timestampLibAddress = (await new TimestampLib__factory(owner).deploy())
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
      Buffer.from("contracts/timestamp/RecordLib.sol:RecordLib", "utf-8")
    )
    -> 0x4aa86fb47714171f15e6e85dc0e79cd2757be45d182cf82fb27a07f13b2b49c7

    Mapping:

    __$4aa86fb47714171f15e6e85dc0e79cd275$__ = "contracts/timestamp/RecordLib.sol:RecordLib"
    __$51d8af212ae13938afd29dd8a87e91365d$__ = "contracts/timestamp/HashAlgoLib.sol:HashAlgoLib"
    __$d57c960d617b3db721236e785ea0ace101$__ = "contracts/timestamp/TimestampLib.sol:TimestampLib"
  */

  const TimestampContract = await new Timestamp__factory(
    {
      __$4aa86fb47714171f15e6e85dc0e79cd275$__: recordLibAddress,
      __$51d8af212ae13938afd29dd8a87e91365d$__: hashAlgoLibAddress,
      __$d57c960d617b3db721236e785ea0ace101$__: timestampLibAddress,
    },
    owner
  ).deploy();

  return TimestampContract;
}

export async function setupTestEnv(): Promise<{
  provider: ethers.providers.Web3Provider;
  timestampContract: Timestamp;
}> {
  const ethersProvider = new ethers.providers.Web3Provider(ganache.provider());

  // Deploy contract
  const timestampContract = await deployTimestampContract(ethersProvider);

  // Return test env variables
  return {
    provider: ethersProvider,
    timestampContract,
  };
}
