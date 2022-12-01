// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "./RecordStorage.sol";
import "./TimestampDetailed.sol";
import "./TimestampLib.sol";
import "./TimestampStorage.sol";
import "./RecordLib.sol";

abstract contract RecordDetailed is RecordStorage {
    using RecordLib for Records;
    using TimestampLib for Timestamps;

    event RecordedHashes(
        bytes32 indexed recordId,
        bytes32[] timestampIds,
        bytes32 versionInfoHash
    );

    /**
     * @dev  timestampVersionHashes enables subjects to timestamp up to three (version) hashes
     *                              of different types at a time and store the timestamps under
     *                              the given record. It creates a new version inside the record to store
     *                              the new timestamps
     */
    function timestampVersionHashes(
        bytes calldata versionHash,
        uint256[] calldata hashAlgorithmIds,
        bytes[] calldata hashValues,
        bytes[] calldata timestampData,
        bytes calldata versionInfo
    ) external {
        bytes32[] memory timestampIds;
        // block scoping to avoid stack too deep
        {
            HashAlgos storage hs = hashAlgoStorage();
            Timestamps storage ts = timestampStorage();
            timestampIds = ts.timestampHashes(
                hs,
                hashAlgorithmIds,
                hashValues,
                timestampData
            );
        }
        Records storage rs = recordStorage();
        rs.timestampVersionHashes(versionHash, timestampIds, versionInfo);
    }

    /**
     * @dev  timestampRecordHashes enables subjects to timestamp up to three record hashes
     *                             of different types at a time. The method will create timestamps
     *                             and collect the timestampIds in a record.
     */
    function timestampRecordHashes(
        uint256[] calldata hashAlgorithmIds,
        bytes[] calldata hashValues,
        bytes[] calldata timestampData,
        bytes calldata versionInfo
    ) external returns (bytes32 recordId) {
        bytes32[] memory timestampIds;
        // block scoping to avoid stack too deep
        {
            HashAlgos storage hs = hashAlgoStorage();
            Timestamps storage ts = timestampStorage();
            timestampIds = ts.timestampHashes(
                hs,
                hashAlgorithmIds,
                hashValues,
                timestampData
            );
        }
        Records storage rs = recordStorage();
        return
            rs.timestampRecordHashes(hashValues[0], timestampIds, versionInfo);
    }

    /**
     * @dev  timestampRecordVersionHashes enables subjects to timestamp up to three (version) hashes
     *                                 of different types at a time and store the timestamps under the given record.
     */
    function timestampRecordVersionHashes(
        bytes32 recordId,
        uint256[] calldata hashAlgorithmIds,
        bytes[] calldata hashValues,
        bytes[] calldata timestampData,
        bytes calldata versionInfo
    ) external {
        bytes32[] memory timestampIds;
        // block scoping to avoid stack too deep
        {
            HashAlgos storage hs = hashAlgoStorage();
            Timestamps storage ts = timestampStorage();
            timestampIds = ts.timestampHashes(
                hs,
                hashAlgorithmIds,
                hashValues,
                timestampData
            );
        }

        Records storage rs = recordStorage();
        rs.timestampRecordVersionHashes(recordId, timestampIds, versionInfo);
    }

    /**
     * @dev  appendRecordVersionHashes enables to append new types of hashes to a given version.
     *       The method will timestamp the hash(es) and add them to the giver version of a Record.
     */
    function appendRecordVersionHashes(
        bytes32 recordId,
        uint256 versionId,
        uint256[] calldata hashAlgorithmIds,
        bytes[] calldata hashValues,
        bytes[] calldata timestampData,
        bytes calldata versionInfo
    ) external {
        bytes32[] memory timestampIds;
        // block scoping to avoid stack too deep
        {
            HashAlgos storage hs = hashAlgoStorage();
            Timestamps storage ts = timestampStorage();
            timestampIds = ts.timestampHashes(
                hs,
                hashAlgorithmIds,
                hashValues,
                timestampData
            );
        }

        Records storage rs = recordStorage();
        rs.appendRecordVersionHashes(
            recordId,
            versionId,
            timestampIds,
            versionInfo
        );
    }

    /**
     * @dev  insertRecordVersionInfo enables to insert additional version info.
     */
    function insertRecordVersionInfo(
        bytes32 recordId,
        uint256 versionId,
        bytes calldata versionInfo
    ) external {
        Records storage rs = recordStorage();
        rs.insertRecordVersionInfo(recordId, versionId, versionInfo);
    }

    /**
     * @dev  detachRecordVersionHash detaches a timestamp id (computed from the hash value) from the given version.
     */
    function detachRecordVersionHash(
        bytes32 recordId,
        uint256 versionId,
        bytes calldata hashValue
    ) external {
        Records storage rs = recordStorage();
        Timestamps storage ts = timestampStorage();
        rs.detachRecordVersionHash(ts, recordId, versionId, hashValue);
    }

    /**
     * @dev insertRecordOwner enables to insert an owner address to the record. OwnerIds list.
     */
    function insertRecordOwner(
        bytes32 recordId,
        string calldata ownerId,
        uint256 notBefore,
        uint256 notAfter
    ) external {
        Records storage rs = recordStorage();
        rs.insertRecordOwner(recordId, ownerId, notBefore, notAfter);
    }

    /**
     * @dev revokeRecordOwner enables to revoke an existing record owner.
     *      Revoked owner's address is removed from record.OwnerIds list and is added to the record.
     *      revokedOwnerIds list.
     */
    function revokeRecordOwner(
        bytes32 recordId,
        string calldata ownerId
    ) external {
        Records storage rs = recordStorage();
        rs.revokeRecordOwner(recordId, ownerId);
    }

    /**
     * @dev getRecordOwnerInfo returns the record's owner info.
     */
    function getRecordOwnerInfo(
        bytes32 recordId,
        string calldata ownerId
    ) public view returns (bool revoked, uint256 notBefore, uint256 notAfter) {
        Records storage rs = recordStorage();
        return rs.getRecordOwnerInfo(recordId, ownerId);
    }

    /**
     * @dev getRecordIdsByOwnerId returns a paginated list of record ids owned by the owner.
     */
    function getRecordIdsByOwnerId(
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
        Records storage rs = recordStorage();
        return rs.getRecordIdsByOwnerId(ownerId, page, pageSize);
    }

    /**
     * @dev getRecordIds returns a paginated list of record ids from recordIdsList
     */
    function getRecordIds(
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
        Records storage rs = recordStorage();
        return rs.getRecordIds(page, pageSize);
    }

    /**
     * @dev getRecordIdsByFirstVersionHash returns a paginated list of record ids of which
     *      the first version contains the hash.
     */
    function getRecordIdsByFirstVersionHash(
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
        Records storage rs = recordStorage();
        return rs.getRecordIdsByFirstVersionHash(hashValue, page, pageSize);
    }

    /**
     * @dev getRecord returns information about a the record.
     */
    function getRecord(
        bytes32 recordId
    )
        public
        view
        returns (
            string[] memory ownerIds,
            string[] memory revokedOwnerIds,
            uint256 totalVersions
        )
    {
        require(recordId != bytes32(0), "recordId empty");
        Records storage rs = recordStorage();
        totalVersions = rs.recordsStore[recordId].totalVersions;
        require(totalVersions > 0, "record unknown");
        ownerIds = rs.recordsStore[recordId].ownerIds;
        revokedOwnerIds = rs.recordsStore[recordId].revokedOwnerIds;
    }

    /**
     * @dev getRecordVersion returns the recordVersion object from recordsStore[recordId].versionsStore[versionId]
     */
    function getRecordVersion(
        bytes32 recordId,
        uint256 versionId,
        uint256 page,
        uint256 pageSize
    )
        public
        view
        returns (
            uint256[] memory hashAlgorithmIds,
            bytes[] memory hashValues,
            bytes32[] memory infoIds,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        Records storage rs = recordStorage();
        bytes32[] memory timestampIds;
        (timestampIds, infoIds, total, howMany, prev, next) = rs
            .getRecordVersionDetails(recordId, versionId, page, pageSize);

        // For every timestampId in versionDetails.timestampIds get the timestamped hash
        Timestamps storage ts = timestampStorage();
        hashAlgorithmIds = new uint256[](timestampIds.length);
        hashValues = new bytes[](timestampIds.length);
        for (uint256 i = 0; i < timestampIds.length; i++) {
            hashAlgorithmIds[i] = ts
                .timestampsStore[timestampIds[i]]
                .hash
                .algorithm;
            hashValues[i] = ts.timestampsStore[timestampIds[i]].hash.value;
        }
    }

    /**
     * @dev getRecordVersionInfo returns version info by version info id (hash) from the versionInfoStore[versionInfoId]
     */
    function getRecordVersionInfo(
        bytes32 versionInfoId
    ) public view returns (bytes memory info) {
        require(versionInfoId != bytes32(0), "versionInfoId empty");
        Records storage rs = recordStorage();
        return rs.versionInfoStore[versionInfoId];
    }
}
