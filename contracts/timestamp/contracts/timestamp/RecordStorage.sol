// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "./TimestampStorage.sol";

abstract contract RecordStorage is TimestampStorage {
    // The state variables we care about.
    bytes32 public constant TS_RECORD_DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.record.storage");

    struct OwnerInfo {
        uint256 notBefore; // time before which the owner should be considered inactive
        uint256 notAfter; // time after which the owner should be considered inactive
        bool revoked; // set to true when revoked
    }

    struct VersionDetails {
        bytes32[] timestampsIds; // one or more version timestamps
        bytes32[] info; // ordered list of version info hashes
    }

    struct Record {
        // ownerId is DID or address of the user that can control the metadata-file-links-store.
        string[] ownerIds;
        string[] revokedOwnerIds;
        // owners information
        mapping(string => OwnerInfo) owners;
        // a list of revoked owner ids and the blocknumber which the owner id is revoked
        mapping(string => uint256) revokedOwnerIdsToBlockNum;
        // mapping of a timestmapID to a version
        mapping(bytes32 => uint256) timestampIdToVersionId;
        // Number of total record versions
        uint256 totalVersions;
        mapping(uint256 => VersionDetails) versionsStore;
    }

    struct Records {
        mapping(bytes32 => Record) recordsStore;
        // version timestamp information key is info hash
        mapping(bytes32 => bytes) versionInfoStore;
        // a list of all record ids. recordId is computed as SHA2-256(tx.signer.Address|blocknumber|hashvalue)
        bytes32[] recordIdsList;
        //  timestampId to list a recordIds
        mapping(bytes32 => bytes32[]) timestampIdToRecordId;
        //  ownerId to list a recordIds
        mapping(string => bytes32[]) ownerIdToRecordId;
        //  hash of the first record version (timestampId) to recordId
        mapping(bytes32 => bytes32[]) firstVersionTimestampToRecordId;
    }

    // Creates and returns the storage pointer to the struct.
    function recordStorage() internal pure returns (Records storage ms) {
        bytes32 position = TS_RECORD_DIAMOND_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }
}
