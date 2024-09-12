/* eslint-disable @typescript-eslint/ban-types */
import { newMockEvent } from "matchstick-as";
import { ethereum, Bytes, BigInt } from "@graphprotocol/graph-ts";
import {
  AddNewHashAlgo,
  UpdateHashAlgo,
  TimestampedHashes,
  NewRecord,
  RecordedHashes,
  VersionUpdated,
  RecordOwnerAdded,
  OwnerIdRevoked,
  RecordVersionInfo,
  TimestampIdDetached,
} from "../generated/Timestamp/Timestamp";
import {
  handleAddNewHashAlgo,
  handleNewRecord,
  handleOwnerIdRevoked,
  handleRecordOwnerAdded,
  handleRecordVersionInfo,
  handleRecordedHashes,
  handleTimestampIdDetached,
  handleTimestampedHashes,
  handleUpdateHashAlgo,
  handleVersionUpdated,
} from "../src/timestamp";

function paramBytes(name: string, value: Bytes): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromBytes(value));
}

function paramString(name: string, value: string): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromString(value));
}

function paramBigInt(name: string, value: BigInt): ethereum.EventParam {
  return new ethereum.EventParam(
    name,
    ethereum.Value.fromUnsignedBigInt(value),
  );
}

function paramI32(name: string, value: i32): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromI32(value));
}

function paramBytesArray(name: string, value: Bytes[]): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromBytesArray(value));
}

function paramBigIntArray(name: string, value: BigInt[]): ethereum.EventParam {
  return new ethereum.EventParam(
    name,
    ethereum.Value.fromUnsignedBigIntArray(value),
  );
}

function i32ArrayToBigIntArray(values: i32[]): BigInt[] {
  const result: BigInt[] = [];
  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; i < values.length; i += 1) {
    result.push(BigInt.fromI32(values[i]));
  }
  return result;
}

export function createAddNewHashAlgoEvent(
  hashId: BigInt,
  ianaNameHash: string,
  outputLength: BigInt,
  oid: string,
  status: i32,
  multiHash: string,
): AddNewHashAlgo {
  const event = changetype<AddNewHashAlgo>(newMockEvent());
  event.parameters = [
    paramBigInt("hashId", hashId),
    paramString("ianaNameHash", ianaNameHash),
    paramBigInt("outputLength", outputLength),
    paramString("oid", oid),
    paramI32("status", status),
    paramString("multiHash", multiHash),
  ];
  return event;
}

export function createUpdateHashAlgoEvent(
  hashId: BigInt,
  ianaName: string,
  outputLength: BigInt,
  oid: string,
  status: i32,
  multiHash: string,
): UpdateHashAlgo {
  const event = changetype<UpdateHashAlgo>(newMockEvent());
  event.parameters = [
    paramBigInt("hashId", hashId),
    paramString("ianaName", ianaName),
    paramBigInt("outputLength", outputLength),
    paramString("oid", oid),
    paramI32("status", status),
    paramString("multiHash", multiHash),
  ];
  return event;
}

export function createTimestampedHashesEvent(
  timestampIds: Bytes[],
  hashAlgorithmIds: i32[],
  hashValues: Bytes[],
  timestampData: Bytes[],
): TimestampedHashes {
  const event = changetype<TimestampedHashes>(newMockEvent());
  event.parameters = [
    paramBytesArray("timestampIds", timestampIds),
    paramBigIntArray(
      "hashAlgorithmIds",
      i32ArrayToBigIntArray(hashAlgorithmIds),
    ),
    paramBytesArray("hashValues", hashValues),
    paramBytesArray("timestampData", timestampData),
  ];
  return event;
}

export function createNewRecordEvent(
  recordId: Bytes,
  timestampIds: Bytes[],
  versionInfo: Bytes,
  versionInfoHash: Bytes,
  ownerId: string,
): NewRecord {
  const event = changetype<NewRecord>(newMockEvent());
  event.parameters = [
    paramBytes("recordId", recordId),
    paramBytesArray("timestampIds", timestampIds),
    paramBytes("versionInfo", versionInfo),
    paramBytes("versionInfoHash", versionInfoHash),
    paramString("ownerId", ownerId),
  ];
  return event;
}

export function createRecordedHashesEvent(
  recordId: Bytes,
  timestampIds: Bytes[],
  versionInfo: Bytes,
  versionInfoHash: Bytes,
): RecordedHashes {
  const event = changetype<RecordedHashes>(newMockEvent());
  event.parameters = [
    paramBytes("recordId", recordId),
    paramBytesArray("timestampIds", timestampIds),
    paramBytes("versionInfo", versionInfo),
    paramBytes("versionInfoHash", versionInfoHash),
  ];
  return event;
}

export function createVersionUpdatedEvent(
  recordId: Bytes,
  timestampIds: Bytes[],
  versionInfo: Bytes,
  versionInfoHash: Bytes,
  versionId: i32,
): VersionUpdated {
  const event = changetype<VersionUpdated>(newMockEvent());
  event.parameters = [
    paramBytes("recordId", recordId),
    paramBytesArray("timestampIds", timestampIds),
    paramBytes("versionInfo", versionInfo),
    paramBytes("versionInfoHash", versionInfoHash),
    paramBigInt("versionId", BigInt.fromI32(versionId)),
  ];
  return event;
}

export function createRecordOwnerAddedEvent(
  recordId: Bytes,
  ownerId: string,
  notBefore: BigInt,
  notAfter: BigInt,
): RecordOwnerAdded {
  const event = changetype<RecordOwnerAdded>(newMockEvent());
  event.parameters = [
    paramBytes("recordId", recordId),
    paramString("ownerId", ownerId),
    paramBigInt("notBefore", notBefore),
    paramBigInt("notAfter", notAfter),
  ];
  return event;
}

export function createOwnerIdRevokedEvent(
  recordId: Bytes,
  ownerId: string,
  notAfter: BigInt,
): OwnerIdRevoked {
  const event = changetype<OwnerIdRevoked>(newMockEvent());
  event.parameters = [
    paramBytes("recordId", recordId),
    paramString("ownerId", ownerId),
    paramBigInt("notAfter", notAfter),
  ];
  return event;
}

export function createRecordVersionInfoEvent(
  recordId: Bytes,
  versionInfo: Bytes,
  versionInfoHash: Bytes,
  versionId: i32,
): RecordVersionInfo {
  const event = changetype<RecordVersionInfo>(newMockEvent());
  event.parameters = [
    paramBytes("recordId", recordId),
    paramBytes("versionInfo", versionInfo),
    paramBytes("versionInfoHash", versionInfoHash),
    paramBigInt("versionId", BigInt.fromI32(versionId)),
  ];
  return event;
}

export function createTimestampIdDetachedEvent(
  timestampId: Bytes,
  recordId: Bytes,
  versionId: i32,
): TimestampIdDetached {
  const event = changetype<TimestampIdDetached>(newMockEvent());
  event.parameters = [
    paramBytes("timestampId", timestampId),
    paramBytes("recordId", recordId),
    paramBigInt("versionId", BigInt.fromI32(versionId)),
  ];
  return event;
}

/**
 * Function to register a new hash algorithm (like sha256)
 *
 * hashAlgorithmId: The original function use total length of
 * algorithms as hashAlgorithmId. Here we pass it as argument
 * for testing purposes
 */
export function insertHashAlgorithm(
  hashAlgorithmId: i32,
  outputLength: i32,
  ianaName: string,
  oid: string,
  status: i32,
  multiHash: string,
): void {
  const event = createAddNewHashAlgoEvent(
    BigInt.fromI32(hashAlgorithmId),
    ianaName,
    BigInt.fromI32(outputLength),
    oid,
    status,
    multiHash,
  );
  handleAddNewHashAlgo(event);
}

/**
 * Function to update an existing hash algorithm
 */
export function updateHashAlgorithm(
  hashAlgorithmId: i32,
  outputLength: i32,
  ianaName: string,
  oid: string,
  status: i32,
  multiHash: string,
): void {
  const event = createUpdateHashAlgoEvent(
    BigInt.fromI32(hashAlgorithmId),
    ianaName,
    BigInt.fromI32(outputLength),
    oid,
    status,
    multiHash,
  );
  handleUpdateHashAlgo(event);
}

/**
 * Function to register a new timestamp
 */
export function timestampHashes(
  hashAlgorithmIds: i32[],
  hashValues: Bytes[],
  timestampData: Bytes[],
): void {
  /**
   * in the original function, the timestampId is sha256 of hashValue. Here we use
   * the same hashValue for testing purposes
   */
  const event = createTimestampedHashesEvent(
    hashValues,
    hashAlgorithmIds,
    hashValues,
    timestampData,
  );
  handleTimestampedHashes(event);
}

/**
 * Function to create a new record with its first version.
 * The version consists in timestamping a document, which
 * can be hashes using different hash algorithms.
 *
 * recordId: In the original function, the recordId is computed
 * from timestamp, sender, and hashes. Here, we pass it as
 * argument for testing purposes.
 */
export function timestampRecordHashes(
  recordId: Bytes,
  hashAlgorithmIds: i32[],
  hashValues: Bytes[],
  timestampData: Bytes[],
  versionInfo: Bytes,
): void {
  const event1 = createTimestampedHashesEvent(
    hashValues,
    hashAlgorithmIds,
    hashValues,
    timestampData,
  );
  handleTimestampedHashes(event1);

  const event2 = createNewRecordEvent(
    recordId,
    hashValues,
    versionInfo,
    versionInfo,
    event1.transaction.from.toHexString(),
  );
  handleNewRecord(event2);
}

/**
 * Function to create a new version in an existing record.
 * The new version consists in timestamping a new version of
 * the document, which can be hashes using different hash algorithms.
 *
 * recordId: In the original function, the first argument is the
 * "versionHash" and it is used to search the "recordId". Here for
 * testing purposes use "recordId" directly
 */
export function timestampVersionHashes(
  /**
   *
   */
  recordId: Bytes,
  hashAlgorithmIds: i32[],
  hashValues: Bytes[],
  timestampData: Bytes[],
  versionInfo: Bytes,
): void {
  const event1 = createTimestampedHashesEvent(
    hashValues,
    hashAlgorithmIds,
    hashValues,
    timestampData,
  );
  handleTimestampedHashes(event1);

  const event2 = createRecordedHashesEvent(
    recordId,
    hashValues,
    versionInfo,
    versionInfo,
  );
  handleRecordedHashes(event2);
}

/**
 * Function to create a new version in an existing record.
 * The new version consists in timestamping a new version of
 * the document, which can be hashes using different hash algorithms.
 */
export function timestampRecordVersionHashes(
  recordId: Bytes,
  hashAlgorithmIds: i32[],
  hashValues: Bytes[],
  timestampData: Bytes[],
  versionInfo: Bytes,
): void {
  const event1 = createTimestampedHashesEvent(
    hashValues,
    hashAlgorithmIds,
    hashValues,
    timestampData,
  );
  handleTimestampedHashes(event1);

  const event2 = createRecordedHashesEvent(
    recordId,
    hashValues,
    versionInfo,
    versionInfo,
  );
  handleRecordedHashes(event2);
}

/**
 * The document can be hashed with different hash algorithms, and this
 * set of hashes correspond to a version of a document. This function
 * adds more hashes to an existing version.
 */
export function appendRecordVersionHashes(
  recordId: Bytes,
  versionId: i32,
  hashAlgorithmIds: i32[],
  hashValues: Bytes[],
  timestampData: Bytes[],
  versionInfo: Bytes,
): void {
  const event1 = createTimestampedHashesEvent(
    hashValues,
    hashAlgorithmIds,
    hashValues,
    timestampData,
  );
  handleTimestampedHashes(event1);

  const event2 = createVersionUpdatedEvent(
    recordId,
    hashValues,
    versionInfo,
    versionInfo,
    versionId,
  );
  handleVersionUpdated(event2);
}

/**
 * Each document version can include some information/metadata about
 * the document. And the history of this information is preserved. This
 * function appends new information to the history.
 */
export function insertRecordVersionInfo(
  recordId: Bytes,
  versionId: i32,
  versionInfo: Bytes,
): void {
  /**
   * the original function creates a hash of versionInfo. Here we use the
   * same versionInfo for testing purposes
   */
  const event = createRecordVersionInfoEvent(
    recordId,
    versionInfo,
    versionInfo,
    versionId,
  );
  handleRecordVersionInfo(event);
}

/**
 * Function to remove a hash from an existing version of a document.
 * The timestamp still exists in the registry but it will not be
 * linked to the record.
 */
export function detachRecordVersionHash(
  recordId: Bytes,
  versionId: i32,
  hashValue: Bytes,
): void {
  const event = createTimestampIdDetachedEvent(hashValue, recordId, versionId);
  handleTimestampIdDetached(event);
}

/**
 * Function to add a new owner to an existing record
 */
export function insertRecordOwner(
  recordId: Bytes,
  ownerId: string,
  notBefore: BigInt,
  notAfter: BigInt,
): void {
  const event = createRecordOwnerAddedEvent(
    recordId,
    ownerId,
    notBefore,
    notAfter,
  );
  handleRecordOwnerAdded(event);
}

/**
 * Function to add a new owner to an existing record
 *
 * notAfter: In the original function, "notAfter" is taken from
 * block.timestamp. Here we pass it as argument for testing purposes
 */
export function revokeRecordOwner(
  recordId: Bytes,
  ownerId: string,
  notAfter: BigInt,
): void {
  const event = createOwnerIdRevokedEvent(recordId, ownerId, notAfter);
  handleOwnerIdRevoked(event);
}
