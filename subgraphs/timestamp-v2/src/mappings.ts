import {
  Address,
  BigInt,
  Bytes,
  ethereum,
  log,
  store,
} from "@graphprotocol/graph-ts";

import {
  HashAlgorithm,
  Record,
  RecordOwner,
  RecordVersion,
  TimestampedHash,
} from "../generated/schema";
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

export function getRecordId(
  from: Bytes,
  blockNumber: BigInt,
  hashValue: Bytes,
): Bytes {
  return from.concatI32(blockNumber.toI32()).concat(hashValue);
}

export function getVersionId(recordId: Bytes, versionNumber: u32): Bytes {
  return recordId.concatI32(versionNumber);
}

export function handleAddNewHashAlgoEvent(event: AddNewHashAlgo): void {
  const hashAlgorithm = new HashAlgorithm(event.params.hashId.toString());

  hashAlgorithm.ianaName = event.params.ianaNameHash.toString();
  hashAlgorithm.multiHash = event.params.multiHash;
  hashAlgorithm.oid = event.params.oid;
  hashAlgorithm.outputLength = event.params.outputLength;
  hashAlgorithm.status = getStatus(event.params.status);

  hashAlgorithm.save();
}

export function handleAppendRecordVersionHashesCall(
  call: AppendRecordVersionHashesCall,
): void {
  // Load existing record
  const record = Record.load(call.inputs.recordId);

  if (!record) return;

  // Load existing version
  const version = RecordVersion.load(
    getVersionId(record.id, call.inputs.versionId.toI32()),
  );

  if (!version) return;

  recordTimestampedHashes(
    call.inputs.hashAlgorithmIds,
    call.inputs.hashValues,
    call.inputs.timestampData,
    [record.id],
    call.block,
    call.transaction,
  );

  // Add timestamps to version
  const timestamps = version.timestamps;
  for (let i = 0; i < call.inputs.hashValues.length; i += 1) {
    timestamps.push(call.inputs.hashValues[i]);
  }
  version.timestamps = timestamps;

  // Add version info
  if (call.inputs.versionInfo.byteLength > 0) {
    const infos = version.infos;
    infos.push(call.inputs.versionInfo);
    version.infos = infos;
  }

  version.save();
}

export function handleDetachRecordVersionHashCall(
  call: DetachRecordVersionHashCall,
): void {
  // Load existing record
  const record = Record.load(call.inputs.recordId);

  if (!record) return;

  // Load existing version
  const version = RecordVersion.load(
    getVersionId(record.id, call.inputs.versionId.toI32()),
  );

  if (!version) return;

  // Remove timestamp from version
  const timestamps: Bytes[] = [];
  for (let i = 0; i < version.timestamps.length; i += 1) {
    if (!version.timestamps[i].equals(call.inputs.hashValue)) {
      timestamps.push(version.timestamps[i]);
    }
  }
  version.timestamps = timestamps;

  version.save();
}

export function handleInsertRecordOwnerCall(call: InsertRecordOwnerCall): void {
  const record = new Record(call.inputs.recordId);

  if (!record) {
    log.error("Record {} not found", [call.inputs.recordId.toHexString()]);
    return;
  }

  const recordOwnerId = record.id.concat(
    Address.fromString(call.inputs.ownerId),
  );

  // Create record owner
  const recordOwner = new RecordOwner(recordOwnerId);
  recordOwner.notBefore = call.inputs.notBefore;
  recordOwner.notAfter = call.inputs.notAfter;
  recordOwner.address = Address.fromString(call.inputs.ownerId);
  recordOwner.record = record.id;
  recordOwner.save();
}

export function handleInsertRecordVersionInfoCall(
  call: InsertRecordVersionInfoCall,
): void {
  // Load existing record
  const record = Record.load(call.inputs.recordId);

  if (!record) return;

  // Load existing version
  const version = RecordVersion.load(
    getVersionId(record.id, call.inputs.versionId.toI32()),
  );

  if (!version) return;

  // Add new version info
  const infos = version.infos;
  infos.push(call.inputs.versionInfo);
  version.infos = infos;

  version.save();
}

export function handleRevokeRecordOwnerCall(call: RevokeRecordOwnerCall): void {
  const record = new Record(call.inputs.recordId);

  if (!record) {
    log.error("Record {} not found", [call.inputs.recordId.toHexString()]);
    return;
  }

  const recordOwnerId = record.id.concat(
    Address.fromString(call.inputs.ownerId),
  );

  // Load record owner
  const recordOwner = RecordOwner.load(recordOwnerId);

  if (!recordOwner) {
    log.error("RecordOwner {} not found", [recordOwnerId.toHexString()]);
    return;
  }

  // Revoke record owner
  store.remove("RecordOwner", recordOwnerId.toHexString());
}

export function handleTimestampHashesCall(call: TimestampHashesCall): void {
  recordTimestampedHashes(
    call.inputs.hashAlgorithmIds,
    call.inputs.hashValues,
    call.inputs.timestampData,
    [],
    call.block,
    call.transaction,
  );
}

export function handleTimestampRecordHashesCall(
  call: TimestampRecordHashesCall,
): void {
  // Create record
  const recordId = getRecordId(
    call.from,
    call.block.number,
    call.inputs.hashValues[0],
  );

  const record = new Record(recordId);

  const recordOwnerId = record.id.concat(call.from);
  const recordOwner = new RecordOwner(recordOwnerId);
  recordOwner.notBefore = call.block.timestamp;
  recordOwner.notAfter = BigInt.fromString("18446744073709551615"); // max u64
  recordOwner.address = call.from;
  recordOwner.record = record.id;
  recordOwner.save();

  // Create timestamps
  recordTimestampedHashes(
    call.inputs.hashAlgorithmIds,
    call.inputs.hashValues,
    call.inputs.timestampData,
    [recordId],
    call.block,
    call.transaction,
  );

  // Create version
  const version = new RecordVersion(getVersionId(record.id, 0));
  version.timestamps = call.inputs.hashValues; // hash values are used a timestamp ID
  version.versionNumber = BigInt.fromU32(0);
  version.record = record.id;
  version.infos = [call.inputs.versionInfo];
  version.save();

  // Save record
  record.save();
}

export function handleTimestampRecordVersionHashesCall(
  call: TimestampRecordVersionHashesCall,
): void {
  // Load existing record
  const record = Record.load(call.inputs.recordId);

  if (!record) return;

  const versions = record.versions.load();

  // Create new version
  const nextVersionId = versions.length;

  const version = new RecordVersion(getVersionId(record.id, nextVersionId));

  recordTimestampedHashes(
    call.inputs.hashAlgorithmIds,
    call.inputs.hashValues,
    call.inputs.timestampData,
    [record.id],
    call.block,
    call.transaction,
  );

  version.timestamps = call.inputs.hashValues;
  version.versionNumber = BigInt.fromU32(nextVersionId);
  version.record = record.id;
  version.infos = [call.inputs.versionInfo];
  version.save();
}

export function handleTimestampVersionHashesCall(
  call: TimestampVersionHashesCall,
): void {
  const timestampedHash = TimestampedHash.load(call.inputs.versionHash);

  if (!timestampedHash) {
    log.error("TimestampedHash {} not found", [
      call.inputs.versionHash.toHexString(),
    ]);
    return;
  }

  if (timestampedHash.records.length !== 1) return;

  // Load existing record
  const record = Record.load(timestampedHash.records[0]);

  if (!record) return;

  const versions = record.versions.load();

  // Create new version
  const nextVersionId = versions.length;

  const version = new RecordVersion(getVersionId(record.id, nextVersionId));

  recordTimestampedHashes(
    call.inputs.hashAlgorithmIds,
    call.inputs.hashValues,
    call.inputs.timestampData,
    [record.id],
    call.block,
    call.transaction,
  );

  version.timestamps = call.inputs.hashValues;
  version.versionNumber = BigInt.fromU32(nextVersionId);
  version.record = record.id;
  version.infos = [call.inputs.versionInfo];
  version.save();

  // Save record
  record.save();
}

export function handleUpdateHashAlgoEvent(event: UpdateHashAlgo): void {
  const hashAlgorithm = HashAlgorithm.load(event.params.hashId.toString());

  if (!hashAlgorithm) return;

  hashAlgorithm.ianaName = event.params.ianaName;
  hashAlgorithm.multiHash = event.params.multiHash;
  hashAlgorithm.oid = event.params.oid;
  hashAlgorithm.outputLength = event.params.outputLength;
  hashAlgorithm.status = getStatus(event.params.status);

  hashAlgorithm.save();
}

function getStatus(i: i32): string {
  switch (i) {
    case 0: {
      return "undefined";
    }
    case 1: {
      return "active";
    }
    case 2: {
      return "revoked";
    }
    default: {
      return "undefined";
    }
  }
}

function recordTimestampedHashes(
  hashAlgorithmIds: BigInt[],
  hashValues: Bytes[],
  timestampData: Bytes[],
  records: Bytes[],
  block: ethereum.Block,
  transaction: ethereum.Transaction,
): void {
  for (let i = 0; i < hashAlgorithmIds.length; i += 1) {
    let timestamp = TimestampedHash.load(hashValues[i]);

    if (timestamp) {
      const allRecords = timestamp.records.concat(records);
      timestamp.records = allRecords;
    } else {
      timestamp = new TimestampedHash(hashValues[i]);

      timestamp.blockNumber = block.number;
      timestamp.blockTimestamp = block.timestamp;
      timestamp.timestampedBy = transaction.from;
      timestamp.transactionHash = transaction.hash;
      timestamp.hashAlgorithm = hashAlgorithmIds[i].toString();
      timestamp.hashValue = hashValues[i];
      timestamp.records = records;
      timestamp.data =
        i < timestampData.length ? timestampData[i] : new Bytes(0);
    }

    timestamp.save();
  }
}
