import { BigInt, Bytes } from "@graphprotocol/graph-ts";

import {
  HashAlgo,
  Owner,
  OwnerRecord,
  Record,
  TimestampSet,
  Version,
  VersionInfo,
} from "../generated/schema";
import {
  AddNewHashAlgo,
  NewRecord,
  OwnerIdRevoked,
  RecordedHashes,
  RecordOwnerAdded,
  RecordVersionInfo,
  TimestampedHashes,
  TimestampIdDetached,
  UpdateHashAlgo,
  VersionUpdated,
} from "../generated/Timestamp/Timestamp";

// event triggered after calling "insertHashAlgorithm"
export function handleAddNewHashAlgo(event: AddNewHashAlgo): void {
  const hashAlgo = new HashAlgo(event.params.hashId.toString());
  hashAlgo.ianaName = event.params.ianaName;
  hashAlgo.multiHash = event.params.multiHash;
  hashAlgo.oid = event.params.oid;
  hashAlgo.outputLength = event.params.outputLength;
  hashAlgo.status = getStatus(event.params.status);
  hashAlgo.save();
}

// event triggered after calling:
// - timestampRecordHashes: New record, 1st version
export function handleNewRecord(event: NewRecord): void {
  let record = Record.load(event.params.recordId);
  if (!record) record = new Record(event.params.recordId);

  let versionInfo = VersionInfo.load(event.params.versionInfoHash);
  if (!versionInfo) versionInfo = new VersionInfo(event.params.versionInfoHash);
  versionInfo.content = event.params.versionInfo;
  versionInfo.save();

  let owner = Owner.load(event.params.ownerId);
  if (!owner) {
    owner = new Owner(event.params.ownerId);
    owner.recordIds = [];
  }
  const recordIds = owner.recordIds;
  recordIds.push(record.id);
  owner.recordIds = recordIds;
  owner.save();

  const ownerRecordId = `${record.id.toHexString()}${event.params.ownerId}`;
  const ownerRecord = new OwnerRecord(ownerRecordId);
  ownerRecord.notBefore = event.block.timestamp;
  ownerRecord.notAfter = BigInt.fromString("18446744073709551615"); // max u64
  ownerRecord.address = event.params.ownerId;
  ownerRecord.save();
  record.owners = [ownerRecordId];

  const version = new Version(getVersionId(record.id, 0));
  const timestamps: Bytes[] = [];

  for (let i = 0, k = event.params.timestampIds.length; i < k; i += 1) {
    const timestamp = TimestampSet.load(event.params.timestampIds[i]);
    if (timestamp) {
      const recordIdsFirstVersion = timestamp.recordIdsFirstVersion;
      recordIdsFirstVersion.push(record.id);
      timestamp.recordIdsFirstVersion = recordIdsFirstVersion;
      timestamp.save();

      timestamps.push(timestamp.id);
    }
  }

  version.timestamps = timestamps;
  version.infos = [versionInfo.id];
  version.versionNumber = BigInt.fromU32(0);
  version.recordId = record.id;
  version.save();

  record.versions = [version.id];
  record.save();
}

// event triggered after calling "revokeRecordOwner"
export function handleOwnerIdRevoked(event: OwnerIdRevoked): void {
  const ownerRecord = OwnerRecord.load(
    `${event.params.recordId.toHexString()}${event.params.ownerId}`,
  );
  if (!ownerRecord) return;

  ownerRecord.notAfter = event.params.notAfter;
  ownerRecord.save();
}

// event triggered after calling:
// - timestampVersionHashes: Existing record, new version (no recordId as argument)
// - timestampRecordVersionHashes: Existing record, new version
export function handleRecordedHashes(event: RecordedHashes): void {
  const record = Record.load(event.params.recordId);
  if (!record) return;

  let versionInfo = VersionInfo.load(event.params.versionInfoHash);
  if (!versionInfo) versionInfo = new VersionInfo(event.params.versionInfoHash);
  versionInfo.content = event.params.versionInfo;
  versionInfo.save();

  const nextVersionId = record.versions ? record.versions.length : 0;
  const version = new Version(getVersionId(record.id, nextVersionId));
  const timestamps: Bytes[] = [];

  for (let i = 0, k = event.params.timestampIds.length; i < k; i += 1) {
    const timestamp = TimestampSet.load(event.params.timestampIds[i]);
    if (timestamp) {
      timestamps.push(timestamp.id);
    }
  }

  version.timestamps = timestamps;
  version.infos = [versionInfo.id];
  version.versionNumber = BigInt.fromU32(nextVersionId);
  version.recordId = record.id;
  version.save();

  const versions = record.versions ? record.versions : [];
  versions.push(version.id);
  record.versions = versions;
  record.save();
}

// event triggered after calling "insertRecordOwner"
export function handleRecordOwnerAdded(event: RecordOwnerAdded): void {
  const record = Record.load(event.params.recordId);
  if (!record) return;

  let ownerRecord = OwnerRecord.load(
    `${record.id.toHexString()}${event.params.ownerId}`,
  );
  if (!ownerRecord) {
    ownerRecord = new OwnerRecord(
      `${record.id.toHexString()}${event.params.ownerId}`,
    );
  }

  ownerRecord.notBefore = event.params.notBefore;
  ownerRecord.notAfter = event.params.notAfter;
  ownerRecord.address = event.params.ownerId;
  ownerRecord.save();

  let ownerExist = false;
  const owners = record.owners ? record.owners : [];
  const ownerRecordId = `${record.id.toHexString()}${event.params.ownerId}`;

  for (let i = 0, k = owners.length; i < k; i += 1) {
    if (owners[i] == ownerRecordId) {
      ownerExist = true;
      break;
    }
  }
  if (!ownerExist) {
    owners.push(ownerRecordId);

    let owner = Owner.load(event.params.ownerId);
    if (!owner) {
      owner = new Owner(event.params.ownerId);
      owner.recordIds = [];
    }
    const recordIds = owner.recordIds;
    recordIds.push(record.id);
    owner.recordIds = recordIds;
    owner.save();
  }
  record.owners = owners;

  record.save();
}

// event triggered after calling "insertRecordVersionInfo"
export function handleRecordVersionInfo(event: RecordVersionInfo): void {
  let versionInfo = VersionInfo.load(event.params.versionInfoHash);
  if (!versionInfo) versionInfo = new VersionInfo(event.params.versionInfoHash);
  versionInfo.content = event.params.versionInfo;
  versionInfo.save();

  const version = Version.load(
    getVersionId(event.params.recordId, event.params.versionId.toU32()),
  );
  if (!version) return;
  const infos = version.infos;
  infos.push(versionInfo.id);
  version.infos = infos;
  version.save();
}

// event triggered after calling "timestampHashes"
export function handleTimestampedHashes(event: TimestampedHashes): void {
  for (let i = 0; i < event.params.hashAlgorithmIds.length; i += 1) {
    const timestamp = new TimestampSet(event.params.timestampIds[i]);
    timestamp.creator = event.transaction.from;
    timestamp.blockNumber = event.block.number;
    timestamp.timestamp = event.block.timestamp;
    timestamp.transactionHash = event.transaction.hash;
    timestamp.hashAlgorithmId = event.params.hashAlgorithmIds[i];
    timestamp.hashValue = event.params.hashValues[i];
    timestamp.recordIdsFirstVersion = [];
    timestamp.timestampData =
      i < event.params.timestampData.length
        ? event.params.timestampData[i]
        : new Bytes(0);
    timestamp.save();
  }
}

// event triggered after calling "detachRecordVersionHash"
export function handleTimestampIdDetached(event: TimestampIdDetached): void {
  const version = Version.load(
    getVersionId(event.params.recordId, event.params.versionId.toU32()),
  );
  if (!version) return;

  const timestamps = version.timestamps;
  for (let i = 0; i < timestamps.length; i += 1) {
    if (timestamps[i].toHexString() == event.params.timestampId.toHexString()) {
      timestamps.splice(i, 1);
      break;
    }
  }
  version.timestamps = timestamps;
  version.save();

  if (event.params.versionId.toU32() == 0) {
    const timestamp = TimestampSet.load(event.params.timestampId);
    if (!timestamp) return;
    const recordIdsFirstVersion = timestamp.recordIdsFirstVersion;
    for (let i = 0; i < recordIdsFirstVersion.length; i += 1) {
      if (
        recordIdsFirstVersion[i].toHexString() ==
        event.params.recordId.toHexString()
      ) {
        recordIdsFirstVersion.splice(i, 1);
        break;
      }
    }
    timestamp.recordIdsFirstVersion = recordIdsFirstVersion;
    timestamp.save();
  }
}

// event triggered after calling "updateHashAlgorithm"
export function handleUpdateHashAlgo(event: UpdateHashAlgo): void {
  const hashAlgo = HashAlgo.load(event.params.hashId.toString());
  if (!hashAlgo) return;
  hashAlgo.ianaName = event.params.ianaName;
  hashAlgo.multiHash = event.params.multiHash;
  hashAlgo.oid = event.params.oid;
  hashAlgo.outputLength = event.params.outputLength;
  hashAlgo.status = getStatus(event.params.status);
  hashAlgo.save();
}

// event triggered after calling:
// - appendRecordVersionHashes: Existing record, existing version
export function handleVersionUpdated(event: VersionUpdated): void {
  let versionInfo = VersionInfo.load(event.params.versionInfoHash);
  if (!versionInfo) versionInfo = new VersionInfo(event.params.versionInfoHash);
  versionInfo.content = event.params.versionInfo;
  versionInfo.save();

  const version = Version.load(
    getVersionId(event.params.recordId, event.params.versionId.toU32()),
  );
  if (!version) return;
  // the version of the document can use different hashing algorithms,
  // and each hash has its own timestamp registration
  const timestamps = version.timestamps;

  for (let i = 0, k = event.params.timestampIds.length; i < k; i += 1) {
    timestamps.push(event.params.timestampIds[i]);
  }

  version.timestamps = timestamps;

  const infos = version.infos;
  infos.push(versionInfo.id);
  version.infos = infos;

  version.save();

  if (event.params.versionId.toU32() == 0) {
    for (let i = 0, k = event.params.timestampIds.length; i < k; i += 1) {
      const timestamp = TimestampSet.load(event.params.timestampIds[i]);
      if (timestamp) {
        const recordIdsFirstVersion = timestamp.recordIdsFirstVersion;
        recordIdsFirstVersion.push(event.params.recordId);
        timestamp.recordIdsFirstVersion = recordIdsFirstVersion;
        timestamp.save();
      }
    }
  }
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

function getVersionId(recordId: Bytes, versionNumber: u32): Bytes {
  const numberAsBytes = Bytes.fromU32(versionNumber);
  const versionId = new Bytes(recordId.length + numberAsBytes.length);
  versionId.set(recordId);
  versionId.set(numberAsBytes, recordId.length);
  return versionId;
}
