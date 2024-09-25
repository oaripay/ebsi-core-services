// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.12;

// Imports necessary contracts and libraries from OpenZeppelin,
// TrackAndTrace interface, DID registry, and EBSI Policy Registry.

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./interfaces/ITrackAndTraceInterface.sol";
import "@ebsiint-sc/trusted-policies-registry-v3/contracts/trusted-policies-registry/interfaces/IPolicyRegistry.sol";
import "@ebsiint-sc/did-registry-v4/contracts/did-registry/interfaces/IDidRegistry.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {EnumerableMapUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableMapUpgradeable.sol";
import "@ebsiint-sc/bootstrap-v2/contracts/utils/Pagination.sol";
import "./libraries/TrackAndTraceLib.sol";

/**
 * @title TrackAndTrace
 * @notice This contract implements a decentralized document and event tracking system that leverages
 * DID (Decentralized Identifiers) and policy-based access control for secure creation, modification,
 * and sharing of documents.
 * The contract allows for document creation, event writing, and access control management
 * (granting and revoking permissions).
 * It integrates with EBSI policy and DID registries to ensure decentralized verification and control over identities.
 */
contract TrackAndTrace is
    UUPSUpgradeable,
    ITrackAndTraceInterface,
    AccessControlUpgradeable
{
    using EnumerableMapUpgradeable for EnumerableMapUpgradeable.Bytes32ToBytes32Map;

    using Pagination for bytes32[];
    using Pagination for bytes[];

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    uint256 public constant MAX_METADATA_LENGTH = 4000;
    uint256 public constant MAX_DELEGATED_CHILDREN = 10;

    // Variables

    // list of all documents created
    mapping(bytes32 => Document) public documents;
    EnumerableMapUpgradeable.Bytes32ToBytes32Map internal documentsMapped;
    mapping(bytes => bytes32[]) internal accessBySubject;
    mapping(bytes => mapping(bytes32 => uint256)) internal accessBySubjectIndex;

    mapping(string => bool) public invitedDidEbsiAccounts;
    IDidRegistry public didRegistry;
    IPolicyRegistry public trustedPoliciesRegistry;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract by setting roles, addresses for policy and DID registries.
     * @param _roleDefaultAdminAddress The address with default admin role.
     * @param _upgraderAddress The address with upgrader role for upgrading the contract.
     * @param _tprAddress The address of the Trusted Policies Registry.
     * @param _didRegistryAddress The address of the DID registry for verifying decentralized identities.
     */
    function initialize(
        address _roleDefaultAdminAddress,
        address _upgraderAddress,
        address _tprAddress,
        address _didRegistryAddress
    ) public initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _roleDefaultAdminAddress);
        _grantRole(UPGRADER_ROLE, _upgraderAddress);
        trustedPoliciesRegistry = IPolicyRegistry(_tprAddress);
        didRegistry = IDidRegistry(_didRegistryAddress);
    }
    /**
     * @notice Authorizes a DID to be either whitelisted or removed.
     * @dev Verifies the sender's identity and policy compliance through EBSI policies before proceeding.
     * @param senderDid The DID of the sender initiating the authorization.
     * @param authorisedDid The DID to be authorized.
     * @param whiteList Boolean flag indicating if the DID should be whitelisted or removed.
     */
    function authoriseDid(
        string calldata senderDid,
        string calldata authorisedDid,
        bool whiteList
    ) external {
        require(
            trustedPoliciesRegistry.checkPolicy("TNT:authoriseDid", msg.sender),
            "Policy error: sender doesn't have the attribute TNT:authoriseDid"
        );

        if (_authorize(bytes(senderDid), ACCOUNT_TYPE.DID_EBSI) == false) {
            revert NotDidController();
        }

        invitedDidEbsiAccounts[authorisedDid] = whiteList;
        emit DidEbsiAuthorised(authorisedDid, whiteList);
    }
    /**
     * @notice Creates a new document, registering its metadata and hash.
     * @dev The creator's DID must be authorized, and they must have proper access permissions to create the document.
     * @param documentHash The hash representing the document content.
     * @param documentMetadata Metadata associated with the document.
     * @param didEbsiCreator DID of the document creator.
     */
    function createDocument(
        bytes32 documentHash,
        string calldata documentMetadata,
        string calldata didEbsiCreator
    ) external {
        // authorize
        if (_authorize(bytes(didEbsiCreator), ACCOUNT_TYPE.DID_EBSI) == false) {
            revert NotDidController();
        }
        if (
            _getAccountAccess(
                bytes32(0),
                bytes(didEbsiCreator),
                SCOPE.TNT_CREATE
            ) == false
        ) {
            revert DidNotInvited();
        }
        _createDocument(
            documentHash,
            documentMetadata,
            block.timestamp,
            Source.Block,
            bytes32(block.number),
            didEbsiCreator
        );
    }
    /**
     * @notice Creates a new document, registering its metadata and hash.
     * @dev The creator's DID must be authorized, and they must have proper access permissions to create the document.
     * @param documentHash The hash representing the document content.
     * @param documentMetadata Metadata associated with the document.
     * @param didEbsiCreator DID of the document creator.
     * @param timestamp external timestamp.
     * @param timestampProof proof for external timestamp.
     */
    function createDocument(
        bytes32 documentHash,
        string calldata documentMetadata,
        string calldata didEbsiCreator,
        uint256 timestamp,
        bytes32 timestampProof
    ) external {
        // authorize signer
        if (_authorize(bytes(didEbsiCreator), ACCOUNT_TYPE.DID_EBSI) == false) {
            revert NotDidController();
        }
        if (
            _getAccountAccess(
                bytes32(0),
                bytes(didEbsiCreator),
                SCOPE.TNT_CREATE
            ) == false
        ) {
            revert DidNotInvited();
        }
        _createDocument(
            documentHash,
            documentMetadata,
            timestamp,
            Source.External,
            timestampProof,
            didEbsiCreator
        );
    }
    /**
     * @notice Removes an existing document by its hash.
     * @dev Only the document's creator or authorized user can remove the document.
     * @param documentHash The hash of the document to be removed.
     */
    function removeDocument(bytes32 documentHash) external {
        // authorize signer
        if (
            _authorize(
                bytes(documents[documentHash].creator),
                ACCOUNT_TYPE.DID_EBSI
            ) == false
        ) {
            revert NotDidController();
        }

        documentsMapped.remove(documentHash);
        delete documents[documentHash];

        emit DocumentRemoved(documentHash);
    }

    function migrationRemoveDocument(bytes32 documentHash) external {
        // the document must be already removed
        if (bytes(documents[documentHash].creator).length > 0) {
            revert DocumentExists();
        }
        require(
            trustedPoliciesRegistry.checkPolicy(
                "TNT:migrationRemoveDocument",
                msg.sender
            ),
            "Policy error: sender doesn't have the attribute TNT:migrationRemoveDocument"
        );
        emit DocumentRemoved(documentHash);
    }
    /**
     * @notice Grants access to a document for a specific subject.
     * @dev The grantedBy account must be authorized, and appropriate permission levels
     * (create, delegate, write) are enforced.
     * @param documentHash The hash of the document for which access is granted.
     * @param grantedByAccount The account granting access.
     * @param subjectAccount The account receiving access.
     * @param grantedByAccType The type of the granting account.
     * @param subjectAccType The type of the receiving account.
     * @param permission The access level (create, delegate, or write).
     */
    function grantAccess(
        bytes32 documentHash,
        bytes calldata grantedByAccount,
        bytes calldata subjectAccount,
        ACCOUNT_TYPE grantedByAccType,
        ACCOUNT_TYPE subjectAccType,
        ACCESS_ENUM permission
    ) external {
        // authorize signer
        if (_authorize(grantedByAccount, grantedByAccType) == false) {
            revert NotDidController();
        }
        // _authorize
        if (
            permission == ACCESS_ENUM.DELEGATE &&
            _getAccountAccess(
                documentHash,
                grantedByAccount,
                SCOPE.TNT_CREATE
            ) ==
            false
        ) {
            revert OnlyCreator();
        } else if (
            permission == ACCESS_ENUM.WRITE &&
            _getAccountAccess(
                documentHash,
                grantedByAccount,
                SCOPE.TNT_CREATE
            ) ==
            false &&
            _getAccountAccess(
                documentHash,
                grantedByAccount,
                SCOPE.TNT_DELEGATE
            ) ==
            false
        ) {
            revert OnlyCreatorOrDelegated();
        }

        _grantAccess(
            documentHash,
            grantedByAccount,
            subjectAccount,
            grantedByAccType,
            subjectAccType,
            permission
        );
    }
    /**
     * @notice Revokes access to a document from a subject.
     * @dev Only the account that granted access can revoke it, and the account must be authorized.
     * @param documentHash The hash of the document for which access is revoked.
     * @param revokedByAccount The account revoking the access.
     * @param subjectAccount The account whose access is being revoked.
     * @param permission The access level being revoked.
     */
    function revokeAccess(
        bytes32 documentHash,
        bytes calldata revokedByAccount,
        bytes calldata subjectAccount,
        ACCESS_ENUM permission
    ) external {
        Document storage doc = documents[documentHash];
        if (
            !TrackAndTraceLib._equal(
                revokedByAccount,
                doc.invited[subjectAccount].grantedBy[permission]
            )
        ) {
            revert OnlyAccessGranter();
        }

        // authorize signer
        if (
            _authorize(
                revokedByAccount,
                doc.invited[subjectAccount].grantedByAccountType[permission]
            ) == false
        ) {
            revert NotDidController();
        }

        _revokeAccess(
            documentHash,
            revokedByAccount,
            subjectAccount,
            permission
        );
    }
    /**
     * @notice Writes a new event for a specific document. The event includes metadata, an external hash,
     *      and the sender's information.
     * @dev This function ensures that the sender is authorized to write the event,
     *      and that they have proper permissions (creator or writer).
     *      The event metadata and sender are recorded along with the document's hash.
     *      The event timestamp and proof are automatically generated using block data.
     * @param eventParams A struct containing the event details, including:
     *      - `documentHash`: The hash of the document the event is related to.
     *      - `externalHash`: A hash representing the external data or event content.
     *      - `sender`: The address or DID of the account writing the event.
     *      - `origin`: A string indicating the origin of the event (e.g., system or user source).
     *      - `metadata`: A string containing additional event-specific information or metadata.
     *
     * Requirements:
     * - The `sender` must be authorized to write to the document.
     * - The sender must have the appropriate permission (`TNT_WRITE`).
     * - The event metadata length must not exceed `MAX_METADATA_LENGTH`.
     *
     * Emits an `EventWritten` event upon success.
     *
     * Reverts:
     * - `NotDidController` if the sender is not authorized to control the DID.
     * - `OnlyCreatorOrWriter` if the sender does not have permission to write the event.
     * - `InvalidMetadata` if the event metadata exceeds the allowed length.
     */
    function writeEvent(WriteEvent calldata eventParams) external {
        // authorize signer
        if (
            _authorize(
                eventParams.sender,
                documents[eventParams.documentHash]
                    .invited[eventParams.sender]
                    .subjectAccountType
            ) == false
        ) {
            revert NotDidController();
        }
        if (
            _getAccountAccess(
                eventParams.documentHash,
                eventParams.sender,
                SCOPE.TNT_WRITE
            ) == false
        ) {
            revert OnlyCreatorOrWriter();
        }
        _writeEvent(
            eventParams,
            block.timestamp,
            Source.Block,
            bytes32(block.number)
        );
    }
    /**
     * @notice Writes a new event for a specific document. The event includes metadata, an external hash,
     *      and the sender's information.
     * @dev This function ensures that the sender is authorized to write the event,
     *      and that they have proper permissions (creator or writer).
     *      The event metadata and sender are recorded along with the document's hash.
     *      The event timestamp and proof are automatically generated using block data.
     * @param eventParams A struct containing the event details, including:
     *      - `documentHash`: The hash of the document the event is related to.
     *      - `externalHash`: A hash representing the external data or event content.
     *      - `sender`: The address or DID of the account writing the event.
     *      - `origin`: A string indicating the origin of the event (e.g., system or user source).
     *      - `metadata`: A string containing additional event-specific information or metadata.
     * @param timestamp external timestamp.
     * @param timestampProof proof for external timestamp.
     * Requirements:
     * - The `sender` must be authorized to write to the document.
     * - The sender must have the appropriate permission (`TNT_WRITE`).
     * - The event metadata length must not exceed `MAX_METADATA_LENGTH`.
     *
     * Emits an `EventWritten` event upon success.
     *
     * Reverts:
     * - `NotDidController` if the sender is not authorized to control the DID.
     * - `OnlyCreatorOrWriter` if the sender does not have permission to write the event.
     * - `InvalidMetadata` if the event metadata exceeds the allowed length.
     */
    function writeEvent(
        WriteEvent calldata eventParams,
        uint256 timestamp,
        bytes32 timestampProof
    ) external {
        // authorize signer
        if (
            _authorize(
                eventParams.sender,
                documents[eventParams.documentHash]
                    .invited[eventParams.sender]
                    .subjectAccountType
            ) == false
        ) {
            revert NotDidController();
        }
        if (
            _getAccountAccess(
                eventParams.documentHash,
                eventParams.sender,
                SCOPE.TNT_WRITE
            ) == false
        ) {
            revert OnlyCreatorOrWriter();
        }
        _writeEvent(eventParams, timestamp, Source.External, timestampProof);
    }

    function getImplementation() external view returns (address) {
        return _getImplementation();
    }
    /**
     * @notice Retrieves a paginated list of document hashes stored in the contract.
     * @dev This function allows users to fetch documents in pages, based on the specified page number and page size.
     *      Pagination is used to efficiently handle large datasets.
     * @param page The page number to retrieve. Must be greater than 0.
     * @param pageSize The number of document hashes to retrieve per page.
     *      Must be greater than 0 and less than or equal to 50.
     * @return items An array of document hashes corresponding to the requested page.
     * @return total The total number of document hashes stored in the contract.
     * @return howMany The number of document hashes returned in the current page.
     * @return prev The previous page number, or 0 if there is no previous page.
     * @return next The next page number, or 0 if there is no next page.
     *
     * Requirements:
     * - `page` must be greater than 0.
     * - `pageSize` must be greater than 0 and less than or equal to 50.
     *
     * Reverts:
     * - `PSize not <= 50` if the `pageSize` exceeds 50.
     * - `PSize not > 0` if the `pageSize` is 0.
     * - `Page not > 0` if the `page` is 0.
     */
    function getDocuments(
        uint256 page,
        uint256 pageSize
    )
        external
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
        return documentsMapped.keys().paginate(page, pageSize);
    }
    /**
     * @notice Retrieves the details of a specific document by its hash.
     * @dev This function returns the metadata, creator, and associated events of a document stored in the contract.
     * @param documentHash The hash of the document to retrieve.
     * @return DocumentGetter A struct containing:
     *      - `creator`: The DID or account that created the document.
     *      - `documentMetadata`: The metadata associated with the document.
     *      - `documentTimestamp`: The timestamp of when the document was created.
     *      - `eventHashes`: An array of event hashes associated with the document.
     *
     * Requirements:
     * - The document identified by `documentHash` must exist.
     *
     * Reverts:
     * - `Document does not exist` if no document with the specified `documentHash` is found.
     */
    function getDocument(
        bytes32 documentHash
    ) external view returns (DocumentGetter memory) {
        Document storage iDoc = documents[documentHash];
        require(bytes(iDoc.creator).length > 0, "Document does not exist");
        DocumentGetter memory doc;
        doc.creator = iDoc.creator;
        doc.documentMetadata = iDoc.documentMetadata;
        doc.documentTimestamp = iDoc.documentTimestamp;
        doc.eventHashes = iDoc.eventHashes;
        return doc;
    }
    /**
     * @notice Retrieves a paginated list of event hashes associated with a specific document.
     * @dev This function allows users to fetch events related to a document in a paginated manner.
     * @param documentHash The hash of the document for which events are being retrieved.
     * @param page The page number to retrieve. Must be greater than 0.
     * @param pageSize The number of event hashes to retrieve per page.
     *     Must be greater than 0 and less than or equal to 50.
     * @return items An array of event hashes corresponding to the requested page.
     * @return total The total number of event hashes associated with the document.
     * @return howMany The number of event hashes returned in the current page.
     * @return prev The previous page number, or 0 if there is no previous page.
     * @return next The next page number, or 0 if there is no next page.
     *
     * Requirements:
     * - `documentHash` must correspond to an existing document.
     * - `page` must be greater than 0.
     * - `pageSize` must be greater than 0 and less than or equal to 50.
     *
     * Reverts:
     * - `PSize not <= 50` if the `pageSize` exceeds 50.
     * - `PSize not > 0` if the `pageSize` is 0.
     * - `Page not > 0` if the `page` is 0.
     * - `Document does not exist` if no document with the specified `documentHash` is found.
     */
    function getEvents(
        bytes32 documentHash,
        uint256 page,
        uint256 pageSize
    )
        external
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
        require(
            bytes(documents[documentHash].creator).length > 0,
            "Document does not exist"
        );
        return documents[documentHash].eventHashes.paginate(page, pageSize);
    }
    /**
     * @notice Retrieves the details of a specific event associated with a document.
     * @dev This function returns the details of an event for a given document, identified by the event's hash.
     * @param documentHash The hash of the document to which the event is associated.
     * @param eventHash The hash of the event to retrieve.
     * @return Event A struct containing the following event details:
     *      - `hash`: The hash of the event.
     *      - `externalHash`: A hash representing external data related to the event.
     *      - `sender`: The account or DID that submitted the event.
     *      - `origin`: The origin of the event (e.g., system or user).
     *      - `eventMetadata`: The metadata associated with the event.
     *      - `eventTimestamp`: A struct containing the timestamp of when the event was recorded.
     *
     * Requirements:
     * - The document identified by `documentHash` must exist.
     * - The event identified by `eventHash` must exist.
     *
     * Reverts:
     * - `Document does not exist` if the document with the specified `documentHash` is not found.
     * - `Event does not exist` if the event with the specified `eventHash` is not found.
     */
    function getEvent(
        bytes32 documentHash,
        bytes32 eventHash
    ) external view returns (Event memory) {
        require(
            bytes(documents[documentHash].creator).length > 0,
            "Document does not exist"
        );
        Event memory ev = documents[documentHash].events[eventHash];
        require(ev.sender.length > 0, "Event does not exist");
        return ev;
    }
    /**
     * @notice Retrieves a paginated list of accounts that have been granted access to a specific document.
     * @dev This function returns the list of accounts (subjects) that have access to a document,
     *      based on the document's hash.
     *      The result is paginated based on the specified page number and page size.
     * @param documentHash The hash of the document for which access details are being retrieved.
     * @param page The page number to retrieve. Must be greater than 0.
     * @param pageSize The number of accounts to retrieve per page. Must be greater than 0 and less than or equal to 50.
     * @return items An array of accounts (subjects) that have access to the document for the requested page.
     * @return total The total number of accounts with access to the document.
     * @return howMany The number of accounts returned in the current page.
     * @return prev The previous page number, or 0 if there is no previous page.
     * @return next The next page number, or 0 if there is no next page.
     *
     * Requirements:
     * - `documentHash` must correspond to an existing document.
     * - `page` must be greater than 0.
     * - `pageSize` must be greater than 0 and less than or equal to 50.
     *
     * Reverts:
     * - `PSize not <= 50` if `pageSize` exceeds 50.
     * - `PSize not > 0` if `pageSize` is 0.
     * - `Page not > 0` if `page` is 0.
     * - `Document does not exist` if no document with the specified `documentHash` is found.
     */
    function getAccessesByDocument(
        bytes32 documentHash,
        uint256 page,
        uint256 pageSize
    )
        external
        view
        returns (
            bytes[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");
        require(
            bytes(documents[documentHash].creator).length > 0,
            "Document does not exist"
        );
        bytes[] storage invitedUsers = documents[documentHash].allInvited;
        return invitedUsers.paginate(page, pageSize);
    }
    /**
     * @notice Retrieves a paginated list of document hashes that a specific subject (account) has access to.
     * @dev This function allows for fetching all documents a subject has been granted access to, using pagination.
     * @param subject The account (subject) whose document accesses are being queried.
     * @param page The page number to retrieve. Must be greater than 0.
     * @param pageSize The number of document hashes to retrieve per page.
     *      Must be greater than 0 and less than or equal to 50.
     * @return items An array of document hashes that the subject has access to, corresponding to the requested page.
     * @return total The total number of documents the subject has access to.
     * @return howMany The number of document hashes returned in the current page.
     * @return prev The previous page number, or 0 if there is no previous page.
     * @return next The next page number, or 0 if there is no next page.
     *
     * Requirements:
     * - `subject` must have access to at least one document.
     * - `page` must be greater than 0.
     * - `pageSize` must be greater than 0 and less than or equal to 50.
     *
     * Reverts:
     * - `PSize not <= 50` if `pageSize` exceeds 50.
     * - `PSize not > 0` if `pageSize` is 0.
     * - `Page not > 0` if `page` is 0.
     * - `Subject does not exist` if the subject does not have access to any documents.
     */
    function getAccessesBySubject(
        bytes calldata subject,
        uint256 page,
        uint256 pageSize
    )
        external
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
        require(accessBySubject[subject].length > 0, "Subject does not exist");
        return accessBySubject[subject].paginate(page, pageSize);
    }
    /**
     * @notice Checks whether the given DID (Decentralized Identifier) is a creator within the system.
     * @dev This function verifies if the provided DID has the permission to create new documents.
     * @param did The Decentralized Identifier (DID) of the account to be checked.
     * @return bool A boolean value indicating whether the given DID is a creator (`true`) or not (`false`).
     *
     * Requirements:
     * - The DID must be present in the system and must have been granted the `TNT_CREATE` permission.
     */
    function isCreator(bytes calldata did) external view returns (bool) {
        return _getAccountAccess(bytes32(0), did, SCOPE.TNT_CREATE);
    }
    /**
     * @notice Checks whether a given account has the specified access level (scope) for a particular document.
     * @dev This function verifies if the account has access to the document based on the requested scope
     *      (e.g., create, write, or delegate permissions).
     * @param documentHash The hash of the document for which access is being checked.
     *      If checking general access (e.g., for creating a new document), pass `bytes32(0)`.
     * @param account The account (or DID) whose access is being checked.
     * @param scopeRequested The scope of access being requested. Possible values are:
     *      - `TNT_CREATE`: Check if the account has permission to create documents.
     *      - `TNT_WRITE`: Check if the account has write access to the document.
     *      - `TNT_DELEGATE`: Check if the account can delegate permissions for the document.
     * @return bool A boolean value indicating whether the account has the requested access (`true`) or not (`false`).
     *
     * Requirements:
     * - The document identified by `documentHash` must exist if checking specific document access.
     * - The `scopeRequested` must be one of the predefined scopes (`TNT_CREATE`, `TNT_WRITE`, `TNT_DELEGATE`).
     *
     * Reverts:
     * - Returns `false` if the account does not have the requested access or if the scope is invalid.
     */
    function getAccountAccess(
        bytes32 documentHash,
        bytes memory account,
        SCOPE scopeRequested
    ) external view returns (bool) {
        return _getAccountAccess(documentHash, account, scopeRequested);
    }
    /**
     * @notice Retrieves the accounts that granted specific access levels to a given DID for a particular document.
     * @dev This function returns the accounts (grantedBy), account types,
     *      and access statuses for the specified DID and access levels on a given document.
     * @param docHash The hash of the document for which the access information is being queried.
     * @param did The Decentralized Identifier (DID) for which access information is being retrieved.
     * @param acc An array of access types (`ACCESS_ENUM`) for which the grantedBy information is being requested.
     *      - Valid values of `ACCESS_ENUM` include `CREATOR`, `DELEGATE`, and `WRITE`.
     * @return bytes[] memory An array of accounts that granted the requested access levels to the specified DID.
     * @return ACCOUNT_TYPE[] memory An array of account types corresponding to the accounts that
     *      granted the requested access.
     * @return bool[] memory An array of boolean values indicating whether the requested
     *      access is granted (`true`) or not (`false`).
     *
     * Requirements:
     * - The `acc` array must contain at least one access type.
     * - The document identified by `docHash` must exist.
     *
     * Reverts:
     * - `InvalidArrayLength` if the `acc` array is empty.
     * - `Document does not exist` if the document with the given `docHash` is not found.
     */
    function getGrantedBy(
        bytes32 docHash,
        bytes calldata did,
        ACCESS_ENUM[] calldata acc
    )
        external
        view
        returns (bytes[] memory, ACCOUNT_TYPE[] memory, bool[] memory)
    {
        if (acc.length == 0) {
            revert InvalidArrayLength();
        }
        require(
            bytes(documents[docHash].creator).length > 0,
            "Document does not exist"
        );
        uint256 accLength = acc.length;
        bytes[] memory grantedByAccounts = new bytes[](accLength);
        ACCOUNT_TYPE[] memory grantedByAccountType = new ACCOUNT_TYPE[](
            accLength
        );
        bool[] memory access = new bool[](accLength);
        Document storage doc = documents[docHash];
        Access_Struct storage accs = doc.invited[did];
        for (uint256 i = 0; i < accLength; i++) {
            if (acc[i] == ACCESS_ENUM.CREATOR) {
                if (compareStrings(string(did), doc.creator)) {
                    grantedByAccounts[i] = did;
                    grantedByAccountType[i] = ACCOUNT_TYPE.DID_EBSI;
                    access[i] = true;
                }
            } else {
                grantedByAccounts[i] = accs.grantedBy[acc[i]];
                grantedByAccountType[i] = accs.grantedByAccountType[acc[i]];
                access[i] = accs.acc[acc[i]];
            }
        }
        return (grantedByAccounts, grantedByAccountType, access);
    }

    // public functions
    function initializeV2(address _tprAddress) public reinitializer(2) {
        trustedPoliciesRegistry = IPolicyRegistry(_tprAddress);
        emit ContractReinitialized(2, abi.encode(_tprAddress));
    }

    // internal functions

    function _onInitialize() internal onlyInitializing {}

    function _createDocument(
        bytes32 documentHash,
        string calldata documentMetadata,
        uint256 timestamp,
        Source timestampSource,
        bytes32 timestampProof,
        string calldata creator
    ) internal {
        if (bytes(documentMetadata).length > MAX_METADATA_LENGTH) {
            revert InvalidMetadata();
        }
        if (bytes(documents[documentHash].creator).length > 0) {
            revert DocumentExists();
        }
        // create document
        Document storage _document = documents[documentHash];
        _document.documentMetadata = documentMetadata;
        _document.creator = creator;
        // add Timestamp
        if (timestamp == 0) {
            revert InvalidTimestamp();
        }
        Timestamp storage _timestamp = _document.documentTimestamp;
        _timestamp.timestamp = timestamp;
        _timestamp.proof = timestampProof;
        _timestamp.source = timestampSource;
        documentsMapped.set(documentHash, documentHash);

        // add helpers
        bytes memory creatorBytes = bytes(creator);
        _document.allInvitedIndex[creatorBytes] = _document.allInvited.length;
        _document.allInvited.push(creatorBytes);

        if (
            accessBySubject[creatorBytes].length == 0 ||
            (accessBySubject[creatorBytes].length > 0 &&
                accessBySubjectIndex[creatorBytes][documentHash] == 0 &&
                accessBySubject[creatorBytes][0] != documentHash)
        ) {
            accessBySubject[creatorBytes].push(documentHash);
            accessBySubjectIndex[creatorBytes][documentHash] =
                accessBySubject[creatorBytes].length -
                1;
        }

        emit DocumentCreated(
            documentHash,
            documentMetadata,
            creator,
            timestamp,
            timestampSource,
            timestampProof
        );
    }

    function _grantAccess(
        bytes32 documentHash,
        bytes calldata grantedByAccount,
        bytes calldata subjectAccount,
        ACCOUNT_TYPE grantedByAccType,
        ACCOUNT_TYPE subjectAccType,
        ACCESS_ENUM permission
    ) internal {
        Document storage _document = documents[documentHash];
        if (_document.invited[subjectAccount].acc[permission]) {
            revert PermissionExists();
        }

        if (
            !TrackAndTraceLib._equal(grantedByAccount, bytes(_document.creator))
        ) {
            // granted by an account with "delegate" permission.
            // Save the subjectAccount as one of its children
            if (
                _document.invited[grantedByAccount].children.length ==
                MAX_DELEGATED_CHILDREN
            ) {
                revert TooManyDelegatedChildren();
            }
            _document.invited[grantedByAccount].children.push(subjectAccount);
            _document.invited[grantedByAccount].childrenIndex[subjectAccount] =
                _document.invited[grantedByAccount].children.length -
                1;
        }

        _document.invited[subjectAccount].acc[permission] = true;
        _document.invited[subjectAccount].grantedBy[
            permission
        ] = grantedByAccount;
        _document.invited[subjectAccount].grantedByAccountType[
            permission
        ] = grantedByAccType;
        if (_document.invited[subjectAccount].subject.length == 0) {
            _document.invited[subjectAccount].subject = subjectAccount;
            _document
                .invited[subjectAccount]
                .subjectAccountType = subjectAccType;
        }
        // add helpers

        if (
            _document.allInvitedIndex[subjectAccount] == 0 &&
            !TrackAndTraceLib._equal(_document.allInvited[0], subjectAccount)
        ) {
            uint256 index = _document.allInvited.length;
            _document.allInvited.push(subjectAccount);
            _document.allInvitedIndex[subjectAccount] = index;
        }

        if (
            accessBySubject[subjectAccount].length == 0 ||
            (accessBySubject[subjectAccount].length > 0 &&
                accessBySubjectIndex[subjectAccount][documentHash] == 0 &&
                accessBySubject[subjectAccount][0] != documentHash)
        ) {
            accessBySubject[subjectAccount].push(documentHash);
            accessBySubjectIndex[subjectAccount][documentHash] =
                accessBySubject[subjectAccount].length -
                1;
        }

        emit AccessGranted(
            documentHash,
            subjectAccount,
            grantedByAccount,
            permission
        );
    }

    function _revokeAccess(
        bytes32 documentHash,
        bytes memory revokedByAccount,
        bytes memory subjectAccount,
        ACCESS_ENUM permission
    ) internal {
        Document storage doc = documents[documentHash];

        delete doc.invited[subjectAccount].acc[permission];
        delete doc.invited[subjectAccount].grantedBy[permission];
        delete doc.invited[subjectAccount].grantedByAccountType[permission];
        if (
            !doc.invited[subjectAccount].acc[ACCESS_ENUM.WRITE] &&
            !doc.invited[subjectAccount].acc[ACCESS_ENUM.DELEGATE] &&
            !TrackAndTraceLib._equal(subjectAccount, bytes(doc.creator))
        ) {
            // remove subject from allInvited
            uint256 index = doc.allInvitedIndex[subjectAccount];
            bytes memory lastAcc = doc.allInvited[doc.allInvited.length - 1];
            doc.allInvited[index] = lastAcc;
            doc.allInvited.pop();
            doc.allInvitedIndex[lastAcc] = index;
            doc.allInvitedIndex[subjectAccount] = 0;

            // remove subject from accessBySubject
            index = accessBySubjectIndex[subjectAccount][documentHash];
            bytes32 lastElement = accessBySubject[subjectAccount][
                accessBySubject[subjectAccount].length - 1
            ];
            accessBySubject[subjectAccount][index] = lastElement;
            accessBySubject[subjectAccount].pop();
            accessBySubjectIndex[subjectAccount][lastElement] = index;
            accessBySubjectIndex[subjectAccount][documentHash] = 0;
        }

        if (
            permission == ACCESS_ENUM.WRITE &&
            !TrackAndTraceLib._equal(revokedByAccount, bytes(doc.creator))
        ) {
            // revoked by an account with "delegate" permission.
            // Remove the subjectAccount from the children
            uint256 index = doc.invited[revokedByAccount].childrenIndex[
                subjectAccount
            ];
            bytes memory lastChild = doc.invited[revokedByAccount].children[
                doc.invited[revokedByAccount].children.length - 1
            ];
            doc.invited[revokedByAccount].children[index] = lastChild;
            doc.invited[revokedByAccount].childrenIndex[lastChild] = index;
            doc.invited[revokedByAccount].children.pop();
            doc.invited[revokedByAccount].childrenIndex[subjectAccount] = 0;
        }

        if (permission == ACCESS_ENUM.DELEGATE) {
            while (doc.invited[subjectAccount].children.length > 0) {
                bytes memory child = doc.invited[subjectAccount].children[0];
                _revokeAccess(
                    documentHash,
                    subjectAccount,
                    child,
                    ACCESS_ENUM.WRITE
                );
            }
        }

        emit AccessRevoked(documentHash, subjectAccount, revokedByAccount);
    }

    function _writeEvent(
        WriteEvent calldata eventParams,
        uint256 timestamp,
        Source timestampSource,
        bytes32 timestampProof
    ) internal {
        if (bytes(eventParams.metadata).length > MAX_METADATA_LENGTH) {
            revert InvalidMetadata();
        }
        bytes32 eventHash = keccak256(bytes(eventParams.externalHash));
        Document storage _document = documents[eventParams.documentHash];
        if (_document.events[eventHash].hash != 0x00) {
            revert ExternalHashExist();
        }
        _document.events[eventHash].hash = eventHash;
        _document.events[eventHash].externalHash = eventParams.externalHash;
        _document.events[eventHash].sender = eventParams.sender;
        _document.events[eventHash].origin = eventParams.origin;
        _document.events[eventHash].eventMetadata = eventParams.metadata;
        // add Timestamp
        if (timestamp == 0) {
            revert InvalidTimestamp();
        }
        Timestamp storage _timestamp = _document
            .events[eventHash]
            .eventTimestamp;
        _timestamp.timestamp = timestamp;
        _timestamp.proof = timestampProof;
        _timestamp.source = timestampSource;

        // helpers

        _document.eventHashes.push(eventHash);

        emit EventWritten(
            eventParams.documentHash,
            eventHash,
            eventParams.sender,
            eventParams.metadata,
            eventParams.origin,
            timestamp,
            timestampSource,
            timestampProof
        );
    }

    function _authorizeUpgrade(address) internal view override {
        if (!hasRole(UPGRADER_ROLE, msg.sender)) {
            revert NotUpgrader();
        }
    }

    function _authorize(
        bytes memory account,
        ACCOUNT_TYPE accountType
    ) internal view returns (bool) {
        // authorise did:ebsi or did:key with msg.sender.
        return
            (accountType == ACCOUNT_TYPE.DID_EBSI &&
                didRegistry.checkController(account, msg.sender)) ||
            (accountType == ACCOUNT_TYPE.DID_KEY &&
                msg.sender == TrackAndTraceLib.getAddress(account));
    }

    function _getAccountAccess(
        bytes32 documentHash,
        bytes memory account,
        SCOPE scopeRequested
    ) internal view returns (bool) {
        Document storage doc = documents[documentHash];
        Access_Struct storage current = doc.invited[account];
        if (SCOPE.TNT_DELEGATE == scopeRequested) {
            return current.acc[ACCESS_ENUM.DELEGATE];
        } else if (SCOPE.TNT_CREATE == scopeRequested) {
            if (documentHash == bytes32(0)) {
                // general tnt create -> to create new document
                return invitedDidEbsiAccounts[string(account)];
            } else {
                return compareStrings(string(account), doc.creator);
            }
        } else if (SCOPE.TNT_WRITE == scopeRequested) {
            return
                compareStrings(string(account), doc.creator) ||
                current.acc[ACCESS_ENUM.WRITE];
        } else {
            return false;
        }
    }

    function compareStrings(
        string memory str1,
        string memory str2
    ) internal pure returns (bool) {
        return
            keccak256(abi.encodePacked(str1)) ==
            keccak256(abi.encodePacked(str2));
    }
}
