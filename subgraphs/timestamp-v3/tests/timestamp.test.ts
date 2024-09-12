import {
  assert,
  describe,
  test,
  clearStore,
  afterAll,
} from "matchstick-as/assembly/index";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  insertHashAlgorithm,
  updateHashAlgorithm,
  timestampHashes,
  timestampRecordHashes,
  timestampVersionHashes,
  timestampRecordVersionHashes,
  appendRecordVersionHashes,
  insertRecordVersionInfo,
  detachRecordVersionHash,
  insertRecordOwner,
  revokeRecordOwner,
} from "./timestamp-utils";

const defaultSender = "0xa16081f360e3847006db660bae1c6d1b2e17ec2a";
const defaultTransactionHash = "0xa16081f360e3847006db660bae1c6d1b2e17ec2a";
const defaultBlock = "1";
const defaultTimestamp = "1";

describe("Timestamp - entity assertions", () => {
  afterAll(() => {
    clearStore();
  });

  test("Insert hash algorithm", () => {
    insertHashAlgorithm(
      1,
      256,
      "sha-256",
      "2.16.840.1.101.3.4.2.1",
      1,
      "sha2-256",
    );
    assert.entityCount("HashAlgo", 1);
    assert.fieldEquals("HashAlgo", "1", "ianaName", "sha-256");
    assert.fieldEquals("HashAlgo", "1", "multiHash", "sha2-256");
    assert.fieldEquals("HashAlgo", "1", "oid", "2.16.840.1.101.3.4.2.1");
    assert.fieldEquals("HashAlgo", "1", "outputLength", "256");
    assert.fieldEquals("HashAlgo", "1", "status", "active");
  });

  test("Update hash algorithm", () => {
    insertHashAlgorithm(2, 384, "sha-384", "bad-oid", 1, "sha2-384");
    updateHashAlgorithm(
      2,
      384,
      "sha-384",
      "2.16.840.1.101.3.4.2.2",
      1,
      "sha2-384",
    );
    assert.entityCount("HashAlgo", 2);
    assert.fieldEquals("HashAlgo", "2", "ianaName", "sha-384");
    assert.fieldEquals("HashAlgo", "2", "multiHash", "sha2-384");
    assert.fieldEquals("HashAlgo", "2", "oid", "2.16.840.1.101.3.4.2.2");
    assert.fieldEquals("HashAlgo", "2", "outputLength", "384");
    assert.fieldEquals("HashAlgo", "2", "status", "active");
  });

  test("Timestamp hashes", () => {
    timestampHashes(
      [1],
      [Bytes.fromHexString("0xfa53")],
      [Bytes.fromHexString("0x0012")],
    );
    assert.entityCount("TimestampSet", 1);
    assert.fieldEquals("TimestampSet", "0xfa53", "hashAlgorithmId", "1");
    assert.fieldEquals("TimestampSet", "0xfa53", "timestampData", "0x0012");
    assert.fieldEquals("TimestampSet", "0xfa53", "hashValue", "0xfa53");
    assert.fieldEquals("TimestampSet", "0xfa53", "creator", defaultSender);
    assert.fieldEquals("TimestampSet", "0xfa53", "blockNumber", defaultBlock);
    assert.fieldEquals("TimestampSet", "0xfa53", "timestamp", defaultTimestamp);
    assert.fieldEquals(
      "TimestampSet",
      "0xfa53",
      "transactionHash",
      defaultTransactionHash,
    );
    assert.fieldEquals("TimestampSet", "0xfa53", "recordIdsFirstVersion", "[]");
  });

  test("Timestamp hashes with different timestampData length", () => {
    timestampHashes([1], [Bytes.fromHexString("0x4d20")], []);
    assert.entityCount("TimestampSet", 2);
    assert.fieldEquals("TimestampSet", "0x4d20", "hashAlgorithmId", "1");
    assert.fieldEquals("TimestampSet", "0x4d20", "timestampData", "0x");
    assert.fieldEquals("TimestampSet", "0x4d20", "hashValue", "0x4d20");
    assert.fieldEquals("TimestampSet", "0x4d20", "creator", defaultSender);
    assert.fieldEquals("TimestampSet", "0x4d20", "blockNumber", defaultBlock);
    assert.fieldEquals("TimestampSet", "0x4d20", "timestamp", defaultTimestamp);
    assert.fieldEquals(
      "TimestampSet",
      "0x4d20",
      "transactionHash",
      defaultTransactionHash,
    );
    assert.fieldEquals("TimestampSet", "0x4d20", "recordIdsFirstVersion", "[]");
  });

  test("Create a new record", () => {
    timestampRecordHashes(
      Bytes.fromHexString("0xce2a"),
      [1],
      [Bytes.fromHexString("0x12e4")],
      [Bytes.fromHexString("0x00ef")],
      Bytes.fromHexString("0xc23e"),
    );
    assert.entityCount("Record", 1);
    assert.entityCount("Version", 1);
    assert.entityCount("Owner", 1);
    assert.entityCount("OwnerRecord", 1);
    assert.entityCount("TimestampSet", 3);
    // record created
    assert.fieldEquals(
      "Record",
      "0xce2a",
      "owners",
      `[0xce2a${defaultSender}]`,
    );
    assert.fieldEquals("Record", "0xce2a", "versions", "[0xce2a00000000]");
    // version created
    assert.fieldEquals("Version", "0xce2a00000000", "timestamps", "[0x12e4]");
    assert.fieldEquals("Version", "0xce2a00000000", "infos", "[0xc23e]");
    assert.fieldEquals("Version", "0xce2a00000000", "recordId", "0xce2a");
    assert.fieldEquals("Version", "0xce2a00000000", "versionNumber", "0");
    // timestamp created
    assert.fieldEquals("TimestampSet", "0x12e4", "hashAlgorithmId", "1");
    assert.fieldEquals("TimestampSet", "0x12e4", "timestampData", "0x00ef");
    assert.fieldEquals("TimestampSet", "0x12e4", "hashValue", "0x12e4");
    assert.fieldEquals("TimestampSet", "0x12e4", "creator", defaultSender);
    assert.fieldEquals("TimestampSet", "0x12e4", "blockNumber", defaultBlock);
    assert.fieldEquals("TimestampSet", "0x12e4", "timestamp", defaultTimestamp);
    assert.fieldEquals(
      "TimestampSet",
      "0x12e4",
      "transactionHash",
      defaultTransactionHash,
    );
    assert.fieldEquals(
      "TimestampSet",
      "0x12e4",
      "recordIdsFirstVersion",
      "[0xce2a]",
    );
  });

  test("Create a new version on a record by using timestampVersionHashes", () => {
    timestampVersionHashes(
      Bytes.fromHexString("0xce2a"),
      [1],
      [Bytes.fromHexString("0x1123")],
      [Bytes.fromHexString("0x356e")],
      Bytes.fromHexString("0x76ab"),
    );
    assert.entityCount("Record", 1);
    assert.entityCount("Version", 2);
    assert.entityCount("Owner", 1);
    assert.entityCount("OwnerRecord", 1);
    assert.entityCount("TimestampSet", 4);
    // same record with 2 versions
    assert.fieldEquals(
      "Record",
      "0xce2a",
      "owners",
      `[0xce2a${defaultSender}]`,
    );
    assert.fieldEquals(
      "Record",
      "0xce2a",
      "versions",
      "[0xce2a00000000, 0xce2a01000000]",
    );
    // version 1
    assert.fieldEquals("Version", "0xce2a00000000", "timestamps", "[0x12e4]");
    assert.fieldEquals("Version", "0xce2a00000000", "infos", "[0xc23e]");
    assert.fieldEquals("Version", "0xce2a00000000", "recordId", "0xce2a");
    assert.fieldEquals("Version", "0xce2a00000000", "versionNumber", "0");
    // version 2
    assert.fieldEquals("Version", "0xce2a01000000", "timestamps", "[0x1123]");
    assert.fieldEquals("Version", "0xce2a01000000", "infos", "[0x76ab]");
    assert.fieldEquals("Version", "0xce2a01000000", "recordId", "0xce2a");
    assert.fieldEquals("Version", "0xce2a01000000", "versionNumber", "1");
    // new timestamp
    assert.fieldEquals("TimestampSet", "0x1123", "hashAlgorithmId", "1");
    assert.fieldEquals("TimestampSet", "0x1123", "timestampData", "0x356e");
    assert.fieldEquals("TimestampSet", "0x1123", "hashValue", "0x1123");
    assert.fieldEquals("TimestampSet", "0x1123", "creator", defaultSender);
    assert.fieldEquals("TimestampSet", "0x1123", "blockNumber", defaultBlock);
    assert.fieldEquals("TimestampSet", "0x1123", "timestamp", defaultTimestamp);
    assert.fieldEquals(
      "TimestampSet",
      "0x1123",
      "transactionHash",
      defaultTransactionHash,
    );
    assert.fieldEquals("TimestampSet", "0x1123", "recordIdsFirstVersion", "[]");
  });

  test("Create a new version on a record by using timestampRecordVersionHashes", () => {
    timestampRecordVersionHashes(
      Bytes.fromHexString("0xce2a"),
      [1],
      [Bytes.fromHexString("0x1e4b")],
      [Bytes.fromHexString("0x1085")],
      Bytes.fromHexString("0x95a2"),
    );
    assert.entityCount("Record", 1);
    assert.entityCount("Version", 3);
    assert.entityCount("Owner", 1);
    assert.entityCount("OwnerRecord", 1);
    assert.entityCount("TimestampSet", 5);
    // same record with 3 versions
    assert.fieldEquals(
      "Record",
      "0xce2a",
      "owners",
      `[0xce2a${defaultSender}]`,
    );
    assert.fieldEquals(
      "Record",
      "0xce2a",
      "versions",
      "[0xce2a00000000, 0xce2a01000000, 0xce2a02000000]",
    );
    // version 1
    assert.fieldEquals("Version", "0xce2a00000000", "timestamps", "[0x12e4]");
    assert.fieldEquals("Version", "0xce2a00000000", "infos", "[0xc23e]");
    assert.fieldEquals("Version", "0xce2a00000000", "recordId", "0xce2a");
    assert.fieldEquals("Version", "0xce2a00000000", "versionNumber", "0");
    // version 2
    assert.fieldEquals("Version", "0xce2a01000000", "timestamps", "[0x1123]");
    assert.fieldEquals("Version", "0xce2a01000000", "infos", "[0x76ab]");
    assert.fieldEquals("Version", "0xce2a01000000", "recordId", "0xce2a");
    assert.fieldEquals("Version", "0xce2a01000000", "versionNumber", "1");
    // version 3
    assert.fieldEquals("Version", "0xce2a02000000", "timestamps", "[0x1e4b]");
    assert.fieldEquals("Version", "0xce2a02000000", "infos", "[0x95a2]");
    assert.fieldEquals("Version", "0xce2a02000000", "recordId", "0xce2a");
    assert.fieldEquals("Version", "0xce2a02000000", "versionNumber", "2");
    // new timestamp
    assert.fieldEquals("TimestampSet", "0x1e4b", "hashAlgorithmId", "1");
    assert.fieldEquals("TimestampSet", "0x1e4b", "timestampData", "0x1085");
    assert.fieldEquals("TimestampSet", "0x1e4b", "hashValue", "0x1e4b");
    assert.fieldEquals("TimestampSet", "0x1e4b", "creator", defaultSender);
    assert.fieldEquals("TimestampSet", "0x1e4b", "blockNumber", defaultBlock);
    assert.fieldEquals("TimestampSet", "0x1e4b", "timestamp", defaultTimestamp);
    assert.fieldEquals(
      "TimestampSet",
      "0x1e4b",
      "transactionHash",
      defaultTransactionHash,
    );
    assert.fieldEquals("TimestampSet", "0x1e4b", "recordIdsFirstVersion", "[]");
  });

  test("Append hash to an existing version", () => {
    appendRecordVersionHashes(
      Bytes.fromHexString("0xce2a"),
      2,
      [1],
      [Bytes.fromHexString("0x09ed")],
      [Bytes.fromHexString("0x111e")],
      Bytes.fromHexString("0xb950"),
    );
    assert.entityCount("Record", 1);
    assert.entityCount("Version", 3);
    assert.entityCount("Owner", 1);
    assert.entityCount("OwnerRecord", 1);
    assert.entityCount("TimestampSet", 6);
    // same record with still 3 versions
    assert.fieldEquals(
      "Record",
      "0xce2a",
      "owners",
      `[0xce2a${defaultSender}]`,
    );
    assert.fieldEquals(
      "Record",
      "0xce2a",
      "versions",
      "[0xce2a00000000, 0xce2a01000000, 0xce2a02000000]",
    );
    // the version 3 now has more hashes
    assert.fieldEquals(
      "Version",
      "0xce2a02000000",
      "timestamps",
      "[0x1e4b, 0x09ed]",
    );
    assert.fieldEquals(
      "Version",
      "0xce2a02000000",
      "infos",
      "[0x95a2, 0xb950]",
    );
    // new timestamp
    assert.fieldEquals("TimestampSet", "0x09ed", "hashAlgorithmId", "1");
    assert.fieldEquals("TimestampSet", "0x09ed", "timestampData", "0x111e");
    assert.fieldEquals("TimestampSet", "0x09ed", "hashValue", "0x09ed");
    assert.fieldEquals("TimestampSet", "0x09ed", "creator", defaultSender);
    assert.fieldEquals("TimestampSet", "0x09ed", "blockNumber", defaultBlock);
    assert.fieldEquals("TimestampSet", "0x09ed", "timestamp", defaultTimestamp);
    assert.fieldEquals(
      "TimestampSet",
      "0x09ed",
      "transactionHash",
      defaultTransactionHash,
    );
    assert.fieldEquals("TimestampSet", "0x09ed", "recordIdsFirstVersion", "[]");
  });

  test("Insert a new version info", () => {
    insertRecordVersionInfo(
      Bytes.fromHexString("0xce2a"),
      2,
      Bytes.fromHexString("0x7707"),
    );
    assert.entityCount("Record", 1);
    assert.entityCount("Version", 3);
    assert.entityCount("Owner", 1);
    assert.entityCount("OwnerRecord", 1);
    assert.entityCount("TimestampSet", 6);
    // extra info in version 3
    assert.fieldEquals(
      "Version",
      "0xce2a02000000",
      "timestamps",
      "[0x1e4b, 0x09ed]",
    );
    assert.fieldEquals(
      "Version",
      "0xce2a02000000",
      "infos",
      "[0x95a2, 0xb950, 0x7707]",
    );
    // new info
    assert.fieldEquals("VersionInfo", "0x7707", "content", "0x7707");
  });

  test("Remove a timestamp from a version", () => {
    detachRecordVersionHash(
      Bytes.fromHexString("0xce2a"),
      2,
      Bytes.fromHexString("0x1e4b"),
    );
    assert.entityCount("Record", 1);
    assert.entityCount("Version", 3);
    assert.entityCount("Owner", 1);
    assert.entityCount("OwnerRecord", 1);
    assert.entityCount("TimestampSet", 6);
    // version 3 without that timestamp
    assert.fieldEquals("Version", "0xce2a02000000", "timestamps", "[0x09ed]");
    assert.fieldEquals(
      "Version",
      "0xce2a02000000",
      "infos",
      "[0x95a2, 0xb950, 0x7707]",
    );
    assert.fieldEquals("Version", "0xce2a02000000", "recordId", "0xce2a");
    assert.fieldEquals("Version", "0xce2a02000000", "versionNumber", "2");
    // the timestamp still exists
    assert.fieldEquals("TimestampSet", "0x1e4b", "hashAlgorithmId", "1");
    assert.fieldEquals("TimestampSet", "0x1e4b", "timestampData", "0x1085");
    assert.fieldEquals("TimestampSet", "0x1e4b", "hashValue", "0x1e4b");
    assert.fieldEquals("TimestampSet", "0x1e4b", "creator", defaultSender);
    assert.fieldEquals("TimestampSet", "0x1e4b", "blockNumber", defaultBlock);
    assert.fieldEquals("TimestampSet", "0x1e4b", "timestamp", defaultTimestamp);
    assert.fieldEquals(
      "TimestampSet",
      "0x1e4b",
      "transactionHash",
      defaultTransactionHash,
    );
    assert.fieldEquals("TimestampSet", "0x1e4b", "recordIdsFirstVersion", "[]");
  });

  test("Insert record owner", () => {
    insertRecordOwner(
      Bytes.fromHexString("0xce2a"),
      "0x92f56c256b72ecf269031a61d4ada3ad2c9c8550",
      BigInt.fromI32(1000),
      BigInt.fromI32(2000),
    );
    assert.entityCount("Record", 1);
    assert.entityCount("Version", 3);
    assert.entityCount("Owner", 2);
    assert.entityCount("OwnerRecord", 2);
    assert.entityCount("TimestampSet", 6);
    // the record now has 2 owners
    assert.fieldEquals(
      "Record",
      "0xce2a",
      "owners",
      `[0xce2a${defaultSender}, 0xce2a0x92f56c256b72ecf269031a61d4ada3ad2c9c8550]`,
    );
    assert.fieldEquals(
      "Record",
      "0xce2a",
      "versions",
      "[0xce2a00000000, 0xce2a01000000, 0xce2a02000000]",
    );

    // owner 1
    assert.fieldEquals("Owner", defaultSender, "recordIds", "[0xce2a]");
    assert.fieldEquals(
      "OwnerRecord",
      `0xce2a${defaultSender}`,
      "notBefore",
      "1",
    );
    assert.fieldEquals(
      "OwnerRecord",
      `0xce2a${defaultSender}`,
      "notAfter",
      "18446744073709551615",
    );

    // owner 2
    assert.fieldEquals(
      "Owner",
      "0x92f56c256b72ecf269031a61d4ada3ad2c9c8550",
      "recordIds",
      "[0xce2a]",
    );
    assert.fieldEquals(
      "OwnerRecord",
      "0xce2a0x92f56c256b72ecf269031a61d4ada3ad2c9c8550",
      "notBefore",
      "1000",
    );
    assert.fieldEquals(
      "OwnerRecord",
      "0xce2a0x92f56c256b72ecf269031a61d4ada3ad2c9c8550",
      "notAfter",
      "2000",
    );
  });

  test("Revoke record owner", () => {
    revokeRecordOwner(
      Bytes.fromHexString("0xce2a"),
      defaultSender,
      BigInt.fromI32(1),
    );
    assert.entityCount("Record", 1);
    assert.entityCount("Version", 3);
    assert.entityCount("Owner", 2);
    assert.entityCount("OwnerRecord", 2);
    assert.entityCount("TimestampSet", 6);
    // the record still has 2 owners (but with different times)
    assert.fieldEquals(
      "Record",
      "0xce2a",
      "owners",
      `[0xce2a${defaultSender}, 0xce2a0x92f56c256b72ecf269031a61d4ada3ad2c9c8550]`,
    );
    assert.fieldEquals(
      "Record",
      "0xce2a",
      "versions",
      "[0xce2a00000000, 0xce2a01000000, 0xce2a02000000]",
    );

    // owner 1: It still exists but it is revoked (notAfter is in the past)
    assert.fieldEquals("Owner", defaultSender, "recordIds", "[0xce2a]");
    assert.fieldEquals(
      "OwnerRecord",
      `0xce2a${defaultSender}`,
      "notBefore",
      "1",
    );
    assert.fieldEquals(
      "OwnerRecord",
      `0xce2a${defaultSender}`,
      "notAfter",
      "1",
    );

    // owner 2
    assert.fieldEquals(
      "Owner",
      "0x92f56c256b72ecf269031a61d4ada3ad2c9c8550",
      "recordIds",
      "[0xce2a]",
    );
    assert.fieldEquals(
      "OwnerRecord",
      "0xce2a0x92f56c256b72ecf269031a61d4ada3ad2c9c8550",
      "notBefore",
      "1000",
    );
    assert.fieldEquals(
      "OwnerRecord",
      "0xce2a0x92f56c256b72ecf269031a61d4ada3ad2c9c8550",
      "notAfter",
      "2000",
    );
  });
});
