// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;

import "./DidRecordStorage.sol";
import "./DidTimestampDetailed.sol";
import "./DidTimestampLib.sol";
import "./DidTimestampStorage.sol";
import "./DidRecordLib.sol";

contract DidRecordDetailed is DidRecordStorage {
    using DidRecordLib for DidRecords;
    using DidTimestampLib for DidTimestamps;

    event DidDocumentInserted(
        bytes32 indexed recordId,
        bytes32 timestampId,
        bytes32 versionInfoHash,
        bytes32 versionMetadataHash
    );

    event DidDocumentUpdated(
        bytes32 indexed recordId,
        bytes32 timestampId,
        bytes32 versionInfoHash,
        bytes32 versionMetadataHash
    );

    event DidControllerInserted(
        bytes32 indexed recordId,
        address newControllerId,
        address controllerId,
        uint256 notBefore,
        uint256 notAfter
    );

    event DidControllerUpdated(
        bytes32 indexed recordId,
        address newControllerId,
        address controllerId,
        uint256 notBefore,
        uint256 notAfter
    );

    event DidRecordOwnerRevoked(
        bytes32 indexed recordId,
        address oldControllerId,
        address newControllerId
    );

    event DidDocumentVersionMetadataAppended(
        bytes32 indexed recordId,
        bytes didVersionMetadata,
        bytes didVersionInfo
    );

    event DidDocumentVersionMetadataDetached(
        bytes32 indexed recordId,
        bytes didVersionMetadata,
        bytes didVersionInfo
    );

    event DidDocumentVersionHashAppended(
        bytes32 indexed recordId,
        bytes32 timestampId,
        bytes didVersionInfo
    );

    event DidDocumentVersionHashDetached(
        bytes32 indexed recordId,
        bytes hashValue,
        bytes didVersionInfo
    );

    /**
     * @dev  insertDidDocument enables insert on the DID registry SC for the first time
     *       a new DID Document that they are the controllers. The method will create
     *       didTimestamp object and create a new didRecord Object (containing the DID,
     *       the controller, the didTimestamp, pointer to didVersionInfoStore), plus store
     *       the DID Document in the didVersionInfoStore.
     */
    function insertDidDocument(
        bytes calldata identifier,
        uint256 hashAlgorithmId,
        bytes calldata hashValue,
        bytes calldata didVersionInfo,
        bytes calldata timestampData,
        bytes calldata didVersionMetadata
    ) external {
        bytes32 timestampId;
        // block scoping to avoid stack too deep
        {
            HashAlgos storage hs = hashAlgoStorage();
            DidTimestamps storage ts = didTimestampStorage();
            timestampId = ts.didTimestampHash(
                hs,
                hashAlgorithmId,
                hashValue,
                timestampData
            );
        }
        DidRecords storage rs = recordStorage();
        rs.insertDidDocument(
            identifier,
            timestampId,
            didVersionInfo,
            didVersionMetadata
        );
    }

    /**
     * @dev  updateDidDocument enables subjects to update an existing DID Document
     *       they control, by adding a new version of the DID Document.
     */
    function updateDidDocument(
        bytes calldata identifier,
        uint256 hashAlgorithmId,
        bytes calldata hashValue,
        bytes calldata didVersionInfo,
        bytes calldata timestampData,
        bytes calldata didVersionMetadata
    ) external {
        bytes32 timestampId;
        // block scoping to avoid stack too deep
        {
            HashAlgos storage hs = hashAlgoStorage();
            DidTimestamps storage ts = didTimestampStorage();
            timestampId = ts.didTimestampHash(
                hs,
                hashAlgorithmId,
                hashValue,
                timestampData
            );
        }
        DidRecords storage rs = recordStorage();
        rs.updateDidDocument(
            identifier,
            timestampId,
            didVersionInfo,
            didVersionMetadata
        );
    }

    /**
     * @dev revokeDidController enables to revoke an existing controller
     *      address that controls the didRecord in the SC for a specific identifier(DID).
     *      Only an existing controller address that will sign the transaction will
     *      be able to revoke an existing controller of a DID. At least one controller
     *      must stay on the didRecord.
     */
    function revokeDidController(
        bytes calldata identifier,
        address oldControllerId
    ) external {
        DidRecords storage rs = recordStorage();
        rs.revokeDidController(identifier, oldControllerId);
    }

    /**
     * @dev  updateDidController enables to replace
     *       an existing controller address that control the didRecord
     *       in the SC for a specific identifier(DID) by a new one.
     *       The existing controller address you want to change is the address
     *       that will sign the transaction and the new controller
     *       address that will replace it is specified as a function parameter
     */
    function updateDidController(
        bytes calldata identifier,
        address newControllerId,
        uint256 notBefore,
        uint256 notAfter
    ) external {
        DidRecords storage rs = recordStorage();
        rs.updateDidController(
            identifier,
            newControllerId,
            notBefore,
            notAfter
        );
    }

    /**
     * @dev  insertDidController enables to insert
     *       a new controller address that control the didRecord
     *       in the SC for a specific identifier(DID). This function can
     *       be used by a controlling user to add a Recovery controller
     *       address in case they loose in the future the keys
     *       of their main controlling address.Only an existing controller
     *       address can perform a transaction to that method to add a
     *       new controller for a specific did.
     */
    function insertDidController(
        bytes calldata identifier,
        address newControllerId,
        uint256 notBefore,
        uint256 notAfter
    ) external {
        DidRecords storage rs = recordStorage();
        rs.insertDidController(
            identifier,
            newControllerId,
            notBefore,
            notAfter
        );
    }

    /**
     * @dev  appendDidDocumentVersionHash enables to append a new type of hash for given DID Doc version.
     *       The method will timestamp the hash and add them to the didRecord,
     *       under the good version. This enables a user to add a more robust
     *       hash value for an existing DID Document version, if in the future
     *       new hash algorithm provide more security.
     */
    function appendDidDocumentVersionHash(
        bytes calldata identifier,
        uint256 hashAlgorithmId,
        bytes calldata hashValue,
        bytes calldata timestampData,
        bytes calldata didVersionInfo
    ) external {
        bytes32 timestampId;
        // block scoping to avoid stack too deep
        {
            HashAlgos storage hs = hashAlgoStorage();
            DidTimestamps storage ts = didTimestampStorage();
            timestampId = ts.didTimestampHash(
                hs,
                hashAlgorithmId,
                hashValue,
                timestampData
            );
        }

        DidRecords storage rs = recordStorage();
        rs.appendDidDocumentVersionHash(
            identifier,
            timestampId,
            didVersionInfo
        );
    }

    /**
     * @dev detachDidDocumentVersionHash detaches an existing hash for a given DID Doc version.
     */
    function detachDidDocumentVersionHash(
        bytes calldata identifier,
        uint256 hashAlgorithmId,
        bytes calldata hashValue,
        bytes calldata didVersionInfo
    ) external {
        DidRecords storage rs = recordStorage();
        DidTimestamps storage ts = didTimestampStorage();
        HashAlgos storage hs = hashAlgoStorage();
        rs.detachDidDocumentVersionHash(
            ts,
            hs,
            identifier,
            hashAlgorithmId,
            hashValue,
            didVersionInfo
        );
    }

    /**
     * @dev  appendDidDocumentVersionMetadata enables to append a new metadata for given DID Doc version.
     */
    function appendDidDocumentVersionMetadata(
        bytes calldata identifier,
        bytes calldata didVersionInfo,
        bytes calldata didVersionMetadata
    ) external {
        DidRecords storage rs = recordStorage();
        rs.appendDidDocumentVersionMetadata(
            identifier,
            didVersionInfo,
            didVersionMetadata
        );
    }

    /**
     * @dev detachDidDocumentVersionMetadata detaches an existing metadata for a given DID Doc version.
     */
    function detachDidDocumentVersionMetadata(
        bytes calldata identifier,
        bytes calldata didVersionInfo,
        bytes calldata didVersionMetadata
    ) external {
        DidRecords storage rs = recordStorage();
        rs.detachDidDocumentVersionMetadata(
            identifier,
            didVersionInfo,
            didVersionMetadata
        );
    }

    /**
     * @dev getDidRecordIdentifiers returns a paginated list of  didRecords identifiers from didRecordIdentifiersList.
     */
    function getDidRecordIdentifiers(uint256 page, uint256 pageSize)
        public
        view
        returns (
            bytes[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        DidRecords storage rs = recordStorage();
        return rs.getDidRecordIdentifiers(page, pageSize);
    }

    /**
     * @dev getDidRecordIdentifiersByControllerId returns a paginated list
     * of  didRecords identifiers owned by controllerId.
     */
    function getDidRecordIdentifiersByControllerId(
        address controllerId,
        uint256 page,
        uint256 pageSize
    )
        public
        view
        returns (
            bytes[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        DidRecords storage rs = recordStorage();
        return
            rs.getDidRecordIdentifiersByControllerId(
                controllerId,
                page,
                pageSize
            );
    }

    /**
     * @dev getDidRecordIdsByControllerId returns a paginated list of  didRecords identifiers owned by controllerId.
     */
    function getDidRecordIdsByControllerId(
        address controllerId,
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
        DidRecords storage rs = recordStorage();
        return rs.getDidRecordIdsByControllerId(controllerId, page, pageSize);
    }

    /**
     * @dev getLatestDidDocumentVersion returns for a specific identifier
     * (did), the didVersionInfo for the latest version of the DID Document.
     */
    function getLatestDidDocumentVersion(bytes calldata identifier)
        public
        view
        returns (bytes memory)
    {
        DidRecords storage rs = recordStorage();
        return rs.getLatestDidDocumentVersion(identifier);
    }

    /**
     * @dev getDidRecord returns information about a specific identifier (did)
     */
    function getDidRecord(bytes calldata identifier)
        public
        view
        returns (address[] memory controllerIds, uint256 totalDidVersions)
    {
        DidRecords storage rs = recordStorage();
        return rs.getDidRecord(identifier);
    }

    /**
     * @dev getDidRecordById returns information about a specific identifier (did)
     */
    function getDidRecordById(bytes32 recordId)
        public
        view
        returns (
            bytes memory identifier,
            address[] memory controllerIds,
            uint256 totalDidVersions
        )
    {
        DidRecords storage rs = recordStorage();
        return rs.getDidRecordById(recordId);
    }

    /**
     * @dev getDidDocumentVersionIds returns a paginated list of didVersionInfoId(s) for a specific identifier
     */
    function getDidDocumentVersionIds(
        bytes calldata identifier,
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
        DidRecords storage rs = recordStorage();
        return rs.getDidDocumentVersionIds(identifier, page, pageSize);
    }

    /**
     * @dev getDidDocumentVersionInfo returns version info by didVersionInfoId
     */
    function getDidDocumentVersionInfo(bytes32 didVersionInfoId)
        public
        view
        returns (bytes memory)
    {
        DidRecords storage rs = recordStorage();
        return rs.getDidDocumentVersionInfo(didVersionInfoId);
    }

    /**
     * @dev getDidDocumentVersionMetadataIds returns a paginated list of
     *      didVersionMetadataId(s) for a specific identifier and a specific didVersionInfoId
     */
    function getDidDocumentVersionMetadataIds(
        bytes calldata identifier,
        bytes32 didVersionInfoId,
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
        DidRecords storage rs = recordStorage();
        return
            rs.getDidDocumentVersionMetadataIds(
                identifier,
                didVersionInfoId,
                page,
                pageSize
            );
    }

    /**
     * @dev getDidDocumentVersionMetadata returns version metadata by
     * didVersionMetadataId from the didVersionMetadataStore
     */
    function getDidDocumentVersionMetadata(bytes32 didVersionMetadataId)
        public
        view
        returns (bytes memory)
    {
        DidRecords storage rs = recordStorage();
        return rs.getDidDocumentVersionMetadata(didVersionMetadataId);
    }

    /**
     * @dev getDidDocumentVersionDidTimestampIds returns version didTimestampIds
     */
    function getDidDocumentVersionDidTimestampIds(
        bytes calldata identifier,
        uint256 versionId
    ) public view returns (bytes32[] memory didTimestampIds) {
        DidRecords storage rs = recordStorage();
        didTimestampIds = rs.getDidDocumentVersionDidTimestampIds(
            identifier,
            versionId
        );
    }

    /**
     * @dev checkController returns true if the 'ctrl' is in the list
     * of controllers of the 'identifier'
     */
    function checkController(bytes calldata identifier, address ctrl)
        external
        view
        returns (bool)
    {
        DidRecords storage rs = recordStorage();
        return rs.checkController(identifier, ctrl);
    }
}
