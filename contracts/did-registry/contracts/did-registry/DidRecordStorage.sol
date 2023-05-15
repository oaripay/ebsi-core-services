// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;
import "./DidTimestampStorage.sol";

contract DidRecordStorage is DidTimestampStorage {
    // The state variables we care about.
    bytes32 public constant TS_RECORD_DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.record.storage");

    struct ControllerInfo {
        uint256 notBefore; // time before which the owner should be considred inactive
        uint256 notAfter; // time after which the owner should be considred inactive
        bool revoked; // set to true when revoked
    }

    struct DidVersionDetails {
        bytes32[] didTimestampsId; // One or more didTimestampId(s) for a specific DID Doc version.
        bytes32[] didVersionInfoId; // An ordered list of version didInfo hashe(s)(sha2-256).
        bytes32[] didVersionMetadataId; //  An ordered list of version didMetadata hashe(s)(sha2-256).
    }

    //A collection of DID Doc including versions, timestamps, controller, for a specific DID
    struct DidRecord {
        bytes didIdentifier;
        //  The DID controller, ethereum address.
        address[] controllerIds;
        //  A list revoked controller ids.  map: controllerId(address) => blockNumber(uint)
        // (from which the controler id is revoked)
        mapping(address => uint256) revokedControllerIds;
        // Additional information about DID controller.
        mapping(address => ControllerInfo) controllersStore;
        // a list of revoked owner ids and the blocknumber which the owner id is revoked
        mapping(address => uint256) revokedControllerIdsToBlockNum;
        // mapping of a timestmapID to a version
        mapping(bytes32 => uint256) didTimestampIdToVersionId;
        // Number of total did record versions
        uint256 totalDidVersions;
        //  A collection of version DID Doc information.
        mapping(uint256 => DidVersionDetails) didVersionsStore;
    }

    struct DidRecords {
        // a collection of DID Doc records
        mapping(bytes32 => DidRecord) didRecordsStore;
        // version DID document Info collection. Sha256 of version information is the key
        mapping(bytes32 => bytes) didVersionInfoStore;
        // a list of all record ids. recordId is comuted as SHA2-256(tx.signer.Address|blocknumber|hashvalue)
        bytes[] didRecordIdentifiersList;
        // A collection of version DID document Metadata (JSON-LD serialized, base64URL).
        mapping(bytes32 => bytes) didVersionMetadataStore;
        // A hash map for finding the VersionId number of a specific DID Doc version
        // map: sha2-256(didVersionInfo) => VersionId(uint)
        mapping(bytes32 => uint256) didVersionInfoIdToVersionId;
        // A hash map for finding the VersionId number of a specific DID Doc version Metadata
        // map: sha2-256(didVersionMetadata) => VersionId(uint)
        mapping(bytes32 => uint256) didVersionMetadataIdToVersionId;
        //  controller to list a recordIds
        mapping(address => bytes32[]) controllerIdToDidRecordId;
        //  Mapping of didTimestampId to didRecordId
        mapping(bytes32 => bytes32[]) didTimestampIdToDidRecordId;
        //  controller to list a record Identifer
        mapping(address => bytes[]) controllerIdToDidRecordIdentifiers;
    }

    // Creates and returns the storage pointer to the struct.
    function recordStorage() internal pure returns (DidRecords storage ms) {
        bytes32 position = TS_RECORD_DIAMOND_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }
}
