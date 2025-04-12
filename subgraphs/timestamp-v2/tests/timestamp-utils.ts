import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { newMockCall, newMockEvent } from "matchstick-as";

import {
  AddNewHashAlgo,
  AppendRecordVersionHashesCall,
  DetachRecordVersionHashCall,
  InsertRecordOwnerCall,
  InsertRecordVersionInfoCall,
  RevokeRecordOwnerCall,
  TimestampHashesCall,
  TimestampRecordHashesCall,
  TimestampRecordVersionHashesCall,
  TimestampVersionHashesCall,
  UpdateHashAlgo,
} from "../generated/Timestamp/Timestamp";
import {
  handleAddNewHashAlgoEvent,
  handleTimestampHashesCall,
  handleUpdateHashAlgoEvent,
} from "../src/mappings";

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
    paramBytes("ianaNameHash", Bytes.fromUTF8(ianaNameHash)),
    paramBigInt("outputLength", outputLength),
    paramString("oid", oid),
    paramI32("status", status),
    paramString("multiHash", multiHash),
  ];

  return event;
}

export function createAppendRecordVersionHashesCall(
  recordId: Bytes,
  versionId: BigInt,
  hashAlgorithmIds: i32[],
  hashValues: Bytes[],
  timestampData: Bytes[],
  versionInfo: Bytes,
): AppendRecordVersionHashesCall {
  const call = changetype<AppendRecordVersionHashesCall>(newMockCall());

  call.inputValues = [
    paramBytes("recordId", recordId),
    paramBigInt("versionId", versionId),
    paramBigIntArray(
      "hashAlgorithmIds",
      i32ArrayToBigIntArray(hashAlgorithmIds),
    ),
    paramBytesArray("hashValues", hashValues),
    paramBytesArray("timestampData", timestampData),
    paramBytes("versionInfo", versionInfo),
  ];

  return call;
}

export function createDetachRecordVersionHashCall(
  recordId: Bytes,
  versionId: BigInt,
  hashValue: Bytes,
): DetachRecordVersionHashCall {
  const call = changetype<DetachRecordVersionHashCall>(newMockCall());

  call.inputValues = [
    paramBytes("recordId", recordId),
    paramBigInt("versionId", versionId),
    paramBytes("hashValues", hashValue),
  ];

  return call;
}

export function createInsertRecordOwnerCall(
  recordId: Bytes,
  ownerId: string,
  notBefore: BigInt,
  notAfter: BigInt,
): InsertRecordOwnerCall {
  const call = changetype<InsertRecordOwnerCall>(newMockCall());

  call.inputValues = [
    paramBytes("recordId", recordId),
    paramString("ownerId", ownerId),
    paramBigInt("notBefore", notBefore),
    paramBigInt("notAfter", notAfter),
  ];

  return call;
}

export function createInsertRecordVersionInfoCall(
  recordId: Bytes,
  versionId: BigInt,
  versionInfo: Bytes,
): InsertRecordVersionInfoCall {
  const call = changetype<InsertRecordVersionInfoCall>(newMockCall());

  call.inputValues = [
    paramBytes("recordId", recordId),
    paramBigInt("versionId", versionId),
    paramBytes("versionInfo", versionInfo),
  ];

  return call;
}

export function createRevokeRecordOwnerCall(
  recordId: Bytes,
  recordOwner: string,
): RevokeRecordOwnerCall {
  const call = changetype<RevokeRecordOwnerCall>(newMockCall());

  call.inputValues = [
    paramBytes("recordId", recordId),
    paramString("ownerId", recordOwner),
  ];

  return call;
}

export function createTimestampHashesCall(
  hashAlgorithmIds: i32[],
  hashValues: Bytes[],
  timestampData: Bytes[],
): TimestampHashesCall {
  const call = changetype<TimestampHashesCall>(newMockCall());

  call.inputValues = [
    paramBigIntArray(
      "hashAlgorithmIds",
      i32ArrayToBigIntArray(hashAlgorithmIds),
    ),
    paramBytesArray("hashValues", hashValues),
    paramBytesArray("timestampData", timestampData),
  ];

  return call;
}

export function createTimestampRecordHashesCall(
  hashAlgorithmIds: i32[],
  hashValues: Bytes[],
  timestampData: Bytes[],
  versionInfo: Bytes,
): TimestampRecordHashesCall {
  const call = changetype<TimestampRecordHashesCall>(newMockCall());

  call.inputValues = [
    paramBigIntArray(
      "hashAlgorithmIds",
      i32ArrayToBigIntArray(hashAlgorithmIds),
    ),
    paramBytesArray("hashValues", hashValues),
    paramBytesArray("timestampData", timestampData),
    paramBytes("versionInfo", versionInfo),
  ];

  return call;
}

export function createTimestampRecordVersionHashes(
  recordId: Bytes,
  hashAlgorithmIds: i32[],
  hashValues: Bytes[],
  timestampData: Bytes[],
  versionInfo: Bytes,
): TimestampRecordVersionHashesCall {
  const call = changetype<TimestampRecordVersionHashesCall>(newMockCall());

  call.inputValues = [
    paramBytes("recordId", recordId),
    paramBigIntArray(
      "hashAlgorithmIds",
      i32ArrayToBigIntArray(hashAlgorithmIds),
    ),
    paramBytesArray("hashValues", hashValues),
    paramBytesArray("timestampData", timestampData),
    paramBytes("versionInfo", versionInfo),
  ];

  return call;
}

export function createTimestampVersionHashesCall(
  versionHash: Bytes,
  hashAlgorithmIds: i32[],
  hashValues: Bytes[],
  timestampData: Bytes[],
  versionInfo: Bytes,
): TimestampVersionHashesCall {
  const call = changetype<TimestampVersionHashesCall>(newMockCall());

  call.inputValues = [
    paramBytes("versionHash", versionHash),
    paramBigIntArray(
      "hashAlgorithmIds",
      i32ArrayToBigIntArray(hashAlgorithmIds),
    ),
    paramBytesArray("hashValues", hashValues),
    paramBytesArray("timestampData", timestampData),
    paramBytes("versionInfo", versionInfo),
  ];

  return call;
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
    paramString("ianaNameHash", ianaName),
    paramString("ianaName", ianaName),
    paramBigInt("outputLength", outputLength),
    paramString("oid", oid),
    paramI32("status", status),
    paramString("multiHash", multiHash),
  ];

  return event;
}

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

  handleAddNewHashAlgoEvent(event);
}

export function timestampHashes(
  hashAlgorithmIds: i32[],
  hashValues: Bytes[],
  timestampData: Bytes[],
): void {
  const call = createTimestampHashesCall(
    hashAlgorithmIds,
    hashValues,
    timestampData,
  );

  handleTimestampHashesCall(call);
}

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

  handleUpdateHashAlgoEvent(event);
}

function i32ArrayToBigIntArray(values: i32[]): BigInt[] {
  const result: BigInt[] = [];

  for (let i = 0, k = values.length; i < k; ++i) {
    result.push(BigInt.fromI32(values[i]));
  }

  return result;
}

function paramBigInt(name: string, value: BigInt): ethereum.EventParam {
  return new ethereum.EventParam(
    name,
    ethereum.Value.fromUnsignedBigInt(value),
  );
}

function paramBigIntArray(name: string, value: BigInt[]): ethereum.EventParam {
  return new ethereum.EventParam(
    name,
    ethereum.Value.fromUnsignedBigIntArray(value),
  );
}

function paramBytes(name: string, value: Bytes): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromBytes(value));
}

function paramBytesArray(name: string, value: Bytes[]): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromBytesArray(value));
}

function paramI32(name: string, value: i32): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromI32(value));
}

function paramString(name: string, value: string): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromString(value));
}
