// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
import "./RecordStorage.sol";
import "../trusted-policies-registry-ethereum-sc/contracts/bootstrap-ethereum-sc/contracts/utils/Pagination.sol";
import "../trusted-policies-registry-ethereum-sc/contracts/bootstrap-ethereum-sc/contracts/utils/StringManip.sol";
import "./TimestampLib.sol";
import "./TimestampStorage.sol";
import "../trusted-policies-registry-ethereum-sc/contracts/bootstrap-ethereum-sc/contracts/utils/SafeAddArray.sol";

library RecordLib {
    using Pagination for bytes32[];
    using StringManip for address;
    using TimestampLib for TimestampStorage.Timestamps;
    using SafeAddArray for bytes32[];
    using SafeAddArray for string[];

    event RecordedHashes(
        bytes32 indexed recordId,
        bytes32[] timestampIds,
        bytes32 versionInfoHash
    );

    /**
     * @dev  checkIfOwnerExist checks if the sender is the owner of the record
     */
    function checkIfOwnerExist(address ownerId, string[] memory ownerIds)
        internal
        pure
        returns (bool)
    {
        string memory ownerIdStr = ownerId.convertToString();
        for (uint256 i; i < ownerIds.length; i++) {
            if (
                keccak256(abi.encodePacked(ownerIds[i])) ==
                keccak256(abi.encodePacked(ownerIdStr))
            ) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev  timestampVersionHashes enables subjects to timestamp up to three (version) hashes
     *                              of different types at a time and store the timestamps under
     *                              the given record. It creates a new version inside the record to store
     *                              the new timestamps
     */
    function timestampVersionHashes(
        RecordStorage.Records storage rs,
        bytes calldata versionHash,
        bytes32[] calldata timestampIds,
        bytes calldata versionInfo
    ) external {
        require(versionHash.length > 0, "versionHash empty");
        //Compute timestampid from the versionHash to get the corresponding recordIds
        bytes32 tsId = sha256(versionHash);
        bytes32[] memory recordIds = rs.timestampIdToRecordId[tsId];
        // if you have more than one you should call timestampRecordVersionHashes
        // and if you have zero you should call timestampRecordHashes
        require(recordIds.length == 1, "wrong record count");

        RecordStorage.Record storage r = rs.recordsStore[recordIds[0]];

        require(
            checkIfOwnerExist(msg.sender, r.ownerIds),
            "sender is not listed as owner"
        );

        RecordStorage.VersionDetails storage vd = r.versionsStore[
            r.totalVersions
        ];

        for (uint256 i; i < timestampIds.length; i++) {
            vd.timestampsIds.push(timestampIds[i]);
            // add this new timestampId to the record list
            rs.timestampIdToRecordId[timestampIds[i]].push(recordIds[0]);
        }
        if (versionInfo.length > 0) {
            bytes32 versionInfoHash = sha256(versionInfo);
            rs.versionInfoStore[versionInfoHash] = versionInfo;
            vd.info.push(versionInfoHash);
        }
        // increment version numbers
        r.totalVersions++;
    }

    /**
     * @dev  timestampRecordHashes enables subjects to timestamp up to three record hashes
     *       of different types at a time. The method will create timestamps and collect
     *       the timestampIds in a record. hashValue is the hash of the first version of
     *       the timestamped object needed to calculate the recordId
     */
    function timestampRecordHashes(
        RecordStorage.Records storage rs,
        bytes calldata hashValue,
        bytes32[] calldata timestampIds,
        bytes calldata versionInfo
    ) external returns (bytes32 recordId) {
        //Compute record unique id as  SHA2-256(tx.signer.address || BlockNumber || hashValue of the timestamp object)
        recordId = sha256(abi.encode(msg.sender, block.number, hashValue));

        RecordStorage.Record storage r = rs.recordsStore[recordId];
        require(r.totalVersions == 0, "record exists");
        rs.recordIdsList.push(recordId);

        string memory ownerId = msg.sender.convertToString();

        rs.ownerIdToRecordId[ownerId].push(recordId);
        r.ownerIds.add(ownerId);

        // solhint-disable-next-line
        r.owners[ownerId] = RecordStorage.OwnerInfo(block.timestamp, 0, false);
        RecordStorage.VersionDetails storage vd = r.versionsStore[0];

        for (uint256 i; i < timestampIds.length; i++) {
            // add this new timestampId to the record list
            rs.timestampIdToRecordId[timestampIds[i]].push(recordId);
            // that timestamp is a first registered version for this new record
            rs.firstVersionTimestampToRecordId[timestampIds[i]].push(recordId);
            // add the timestampId to the version detail
            vd.timestampsIds.add(timestampIds[i]);
        }
        if (versionInfo.length > 0) {
            bytes32 versionInfoHash = sha256(versionInfo);
            rs.versionInfoStore[versionInfoHash] = versionInfo;
            vd.info.add(versionInfoHash);
            emit RecordedHashes(recordId, timestampIds, versionInfoHash);
        } else {
            emit RecordedHashes(recordId, timestampIds, bytes32(0));
        }

        // increment version numbers
        r.totalVersions++;
    }

    /**
     * @dev  timestampRecordVersionHashes enables subjects to timestamp up to three (version) hashes
     *                                 of different types at a time and store the timestamps under the given record.
     */
    function timestampRecordVersionHashes(
        RecordStorage.Records storage rs,
        bytes32 recordId,
        bytes32[] calldata timestampIds,
        bytes calldata versionInfo
    ) external {
        require(recordId != bytes32(0), "recordId empty");
        // check record exists
        RecordStorage.Record storage r = rs.recordsStore[recordId];

        require(r.totalVersions > 0, "record unknown");
        require(
            checkIfOwnerExist(msg.sender, r.ownerIds),
            "sender is not listed as owner"
        );

        // create a new version detail

        RecordStorage.VersionDetails storage vd = r.versionsStore[
            r.totalVersions
        ];
        for (uint256 i; i < timestampIds.length; i++) {
            vd.timestampsIds.push(timestampIds[i]);
            // add this new timestampId to the record list

            rs.timestampIdToRecordId[timestampIds[i]].add(recordId);
        }
        if (versionInfo.length > 0) {
            bytes32 versionInfoHash = sha256(versionInfo);
            rs.versionInfoStore[versionInfoHash] = versionInfo;
            vd.info.push(versionInfoHash);
            emit RecordedHashes(recordId, timestampIds, versionInfoHash);
        } else {
            emit RecordedHashes(recordId, timestampIds, bytes32(0));
        }
        // increment version numbers
        r.totalVersions++;
    }

    /**
     * @dev  appendRecordVersionHashes enables to append new types of hashes to a given version.
     *       The method will timestamp the hash(es) and add them to the giver version of a Record.
     */
    function appendRecordVersionHashes(
        RecordStorage.Records storage rs,
        bytes32 recordId,
        uint256 versionId,
        bytes32[] calldata timestampIds,
        bytes calldata versionInfo
    ) external {
        require(recordId != bytes32(0), "recordId empty");
        RecordStorage.VersionDetails storage vd = rs
            .recordsStore[recordId]
            .versionsStore[versionId];

        require(vd.timestampsIds.length > 0, "record/version unknown");
        require(
            checkIfOwnerExist(msg.sender, rs.recordsStore[recordId].ownerIds),
            "sender is not listed as owner"
        );

        for (uint256 i; i < timestampIds.length; i++) {
            // add this new timestampId to the record list
            rs.timestampIdToRecordId[timestampIds[i]].push(recordId);
            // add the timestampId to the version detail
            vd.timestampsIds.push(timestampIds[i]);
        }
        if (versionInfo.length > 0) {
            bytes32 versionInfoHash = sha256(versionInfo);
            rs.versionInfoStore[versionInfoHash] = versionInfo;
            vd.info.push(versionInfoHash);
            emit RecordedHashes(recordId, timestampIds, versionInfoHash);
        } else {
            emit RecordedHashes(recordId, timestampIds, bytes32(0));
        }
    }

    /**
     * @dev  insertRecordVersionInfo enables to insert additional version info.
     */
    function insertRecordVersionInfo(
        RecordStorage.Records storage rs,
        bytes32 recordId,
        uint256 versionId,
        bytes calldata versionInfo
    ) external {
        require(recordId != bytes32(0), "recordId empty");
        require(versionInfo.length > 0, "versionInfo empty");
        RecordStorage.VersionDetails storage vd = rs
            .recordsStore[recordId]
            .versionsStore[versionId];
        require(vd.timestampsIds.length > 0, "record/version unknown");
        require(
            checkIfOwnerExist(msg.sender, rs.recordsStore[recordId].ownerIds),
            "sender is not listed as owner"
        );

        bytes32 versionInfoHash = sha256(versionInfo);
        rs.versionInfoStore[versionInfoHash] = versionInfo;
        vd.info.push(versionInfoHash);
    }

    /**
     * @dev  detachRecordVersionHash detaches a timestamp id (computed from the hash value) from the given version.
     */
    function detachRecordVersionHash(
        RecordStorage.Records storage rs,
        TimestampStorage.Timestamps storage ts,
        bytes32 recordId,
        uint256 versionId,
        bytes calldata hashValue
    ) external {
        require(recordId != bytes32(0), "recordId empty");
        require(hashValue.length > 0, "hashValue empty");
        RecordStorage.VersionDetails storage vd = rs
            .recordsStore[recordId]
            .versionsStore[versionId];
        require(vd.timestampsIds.length > 0, "record/version unknown");
        require(
            checkIfOwnerExist(msg.sender, rs.recordsStore[recordId].ownerIds),
            "sender is not listed as owner"
        );

        bytes32 timestampId = sha256(hashValue);
        // check that the timestampId exists in the timestampsStore
        require(
            ts.timestampsStore[timestampId].hash.value.length > 0,
            "timestampId unknown"
        );

        // remove timestampId from versionDetail
        for (uint256 i = 0; i < vd.timestampsIds.length; i++) {
            if (vd.timestampsIds[i] == timestampId) {
                vd.timestampsIds[i] = vd.timestampsIds[
                    vd.timestampsIds.length - 1
                ];
                vd.timestampsIds.pop();
                break;
            }
        }
    }

    /**
     * @dev insertRecordOwner enables to insert an owner address to the record. OwnerIds list.
     */
    function insertRecordOwner(
        RecordStorage.Records storage rs,
        bytes32 recordId,
        string calldata ownerId,
        uint256 notBefore,
        uint256 notAfter
    ) external {
        require(recordId != bytes32(0), "recordId empty");
        require(bytes(ownerId).length > 0, "ownerId empty");
        require(
            notAfter > 0
                ? notAfter > notBefore && notBefore > 0
                : notBefore > 0,
            "date incorrect"
        );
        RecordStorage.Record storage r = rs.recordsStore[recordId];
        require(r.totalVersions > 0, "record unknown");
        require(
            r.owners[ownerId].notBefore == 0 ||
                r.owners[ownerId].revoked == true,
            "ownerId exist"
        );
        require(
            checkIfOwnerExist(msg.sender, r.ownerIds),
            "sender is not listed as owner"
        );

        r.ownerIds.add(ownerId);
        rs.ownerIdToRecordId[ownerId].push(recordId);
        // increment owners
        r.owners[ownerId] = RecordStorage.OwnerInfo(notBefore, notAfter, false);
    }

    /**
     * @dev revokeRecordOwner enables to revoke an existing record owner.
     *      Revoked owner's address is removed from record.OwnerIds list
     *      and is added to the record.revokedOwnerIds list.
     */
    function revokeRecordOwner(
        RecordStorage.Records storage rs,
        bytes32 recordId,
        string calldata ownerId
    ) external {
        require(recordId != bytes32(0), "recordId empty");
        require(bytes(ownerId).length > 0, "ownerId empty");
        RecordStorage.Record storage r = rs.recordsStore[recordId];
        require(r.totalVersions > 0, "record unknown");
        require(
            checkIfOwnerExist(msg.sender, r.ownerIds),
            "sender is not listed as owner"
        );

        // remove ownerId from ownerIds
        bool ownerIdFound = false;
        bytes32 ownerIdHash = keccak256(bytes(ownerId));
        for (uint256 i = 0; i < r.ownerIds.length; i++) {
            if (keccak256(bytes(r.ownerIds[i])) == ownerIdHash) {
                r.ownerIds[i] = r.ownerIds[r.ownerIds.length - 1];
                r.ownerIds.pop();
                ownerIdFound = true;
                break;
            }
        }
        require(ownerIdFound, "ownerId unknown");

        r.revokedOwnerIds.add(ownerId);
        // Remove the record owner from ownerIdToRecordId map.
        for (uint256 i = 0; i < rs.ownerIdToRecordId[ownerId].length; i++) {
            if (rs.ownerIdToRecordId[ownerId][i] == recordId) {
                rs.ownerIdToRecordId[ownerId][i] = rs.ownerIdToRecordId[
                    ownerId
                ][rs.ownerIdToRecordId[ownerId].length - 1];
                rs.ownerIdToRecordId[ownerId].pop();
                break;
            }
        }

        // set the ownerInfo to revoked
        r.owners[ownerId].revoked = true;
    }

    /**
     * @dev getRecordOwnerInfo returns the record's owner info.
     */
    function getRecordOwnerInfo(
        RecordStorage.Records storage rs,
        bytes32 recordId,
        string calldata ownerId
    )
        public
        view
        returns (
            bool revoked,
            uint256 notBefore,
            uint256 notAfter
        )
    {
        require(recordId != bytes32(0), "recordId empty");
        require(bytes(ownerId).length > 0, "ownerId empty");
        RecordStorage.Record storage r = rs.recordsStore[recordId];
        require(r.totalVersions > 0, "record unknown");

        return (
            r.owners[ownerId].revoked,
            r.owners[ownerId].notBefore,
            r.owners[ownerId].notAfter
        );
    }

    /**
     * @dev getRecordIdsByOwnerId returns a paginated list of record ids owned by the owner.
     */
    function getRecordIdsByOwnerId(
        RecordStorage.Records storage rs,
        string calldata ownerId,
        uint256 page,
        uint256 pageSize
    )
        public
        view
        returns (
            bytes32[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");
        require(bytes(ownerId).length > 0, "ownerId empty");
        return rs.ownerIdToRecordId[ownerId].paginate(page, pageSize);
    }

    /**
     * @dev getRecordIds returns a paginated list of record ids from recordIdsList
     */
    function getRecordIds(
        RecordStorage.Records storage rs,
        uint256 page,
        uint256 pageSize
    )
        public
        view
        returns (
            bytes32[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");

        return rs.recordIdsList.paginate(page, pageSize);
    }

    /**
     * @dev getRecordIdsByFirstVersionHash returns a paginated list of record ids
     *      of which the first version contains the hash.
     */
    function getRecordIdsByFirstVersionHash(
        RecordStorage.Records storage rs,
        bytes calldata hashValue,
        uint256 page,
        uint256 pageSize
    )
        public
        view
        returns (
            bytes32[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        require(hashValue.length > 0, "hashValue empty");
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");

        return
            rs.firstVersionTimestampToRecordId[sha256(hashValue)].paginate(
                page,
                pageSize
            );
    }

    /**
     * @dev getRecordVersion returns the recordVersion object from recordsStore[recordId].versionsStore[versionId]
     */
    function getRecordVersionDetails(
        RecordStorage.Records storage rs,
        bytes32 recordId,
        uint256 versionId,
        uint256 page,
        uint256 pageSize
    )
        public
        view
        returns (
            bytes32[] memory timestampsIds,
            bytes32[] memory infoIds,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        require(recordId != bytes32(0), "recordId empty");
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");
        RecordStorage.VersionDetails memory vd = rs
            .recordsStore[recordId]
            .versionsStore[versionId];
        (timestampsIds, total, howMany, prev, next) = vd.timestampsIds.paginate(
            page,
            pageSize
        );
        // no pagination as we might have less info than timestamps
        infoIds = vd.info;
    }
}
