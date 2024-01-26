// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./interfaces/ITrackAndTraceInterface.sol";
import "@ebsiint-sc/did-registry-v3/contracts/did-registry/interfaces/IDidRegistry.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {EnumerableMapUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableMapUpgradeable.sol";
import "@ebsiint-sc/bootstrap-v2/contracts/utils/Pagination.sol";

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

    // Variables

    // list of all documents created
    mapping(bytes32 => Document) public documents;
    EnumerableMapUpgradeable.Bytes32ToBytes32Map internal documentsMapped;
    mapping(bytes => bytes32[]) internal accessBySubject;
    mapping(bytes => mapping(bytes32 => uint256)) internal accessBySubjectIndex;

    mapping(string => bool) public invitedDidEbsiAccounts;

    IDidRegistry public didRegistry;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _roleDefaultAdminAddress,
        address _upgraderAddress,
        address _didRegistryAddress
    ) public initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _roleDefaultAdminAddress);
        _grantRole(UPGRADER_ROLE, _upgraderAddress);
        didRegistry = IDidRegistry(_didRegistryAddress);
    }

    function authoriseDid(string calldata didEbsi, bool whiteList) external {
        if (_authorize(bytes(didEbsi), ACCOUNT_TYPE.DID_EBSI) == false) {
            revert NotDidController();
        }
        if (
            _getAccountAccess(
                bytes32(0),
                bytes(didEbsi),
                ACCOUNT_TYPE.DID_EBSI,
                SCOPE.TNT_AUTHORIZE
            ) == false
        ) {
            revert NotAuthorised();
        }
        invitedDidEbsiAccounts[didEbsi] = whiteList;
        emit DidEbsiAuthorised(didEbsi, whiteList);
    }

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
                ACCOUNT_TYPE.DID_EBSI,
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
                ACCOUNT_TYPE.DID_EBSI,
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

    function removeDocument(bytes32 documentHash) external {
        // authorize signer
        if (_authorize(bytes(documents[documentHash].creator), ACCOUNT_TYPE.DID_EBSI) == false) {
            revert NotDidController();
        }
        if (
            _getAccountAccess(
                documentHash,
                bytes(documents[documentHash].creator),
                ACCOUNT_TYPE.DID_EBSI,
                SCOPE.TNT_CREATE
            ) == false
        ) {
            revert OnlyCreator();
        }
        documentsMapped.remove(documentHash);
        delete documents[documentHash];
    }

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
                grantedByAccType,
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
                grantedByAccType,
                SCOPE.TNT_CREATE
            ) ==
            false &&
            _getAccountAccess(
                documentHash,
                grantedByAccount,
                grantedByAccType,
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

    function revokeAccess(
        bytes32 documentHash,
        bytes calldata revokeByAccount,
        bytes calldata subjectAccount,
        ACCESS_ENUM permission
    ) external {
        Document storage doc = documents[documentHash];
        // authorize signer
        if (
            _authorize(revokeByAccount, doc.invited[subjectAccount].grantedByAccountType[permission]) == false
            && _authorize(revokeByAccount, ACCOUNT_TYPE.DID_EBSI) == false // in case is creator
        ) {
            revert NotDidController();
        }
        if (
            !_equal(
                revokeByAccount,
                doc.invited[subjectAccount].grantedBy[permission]
            )
            &&
            !_equal(
                revokeByAccount,
                bytes(doc.creator)
            )
        ) {
            revert OnlyCreatorOrDelegated();
        }
        delete doc.invited[subjectAccount].acc[permission];
        delete doc.invited[subjectAccount].grantedBy[permission];
        delete doc.invited[subjectAccount].grantedByAccountType[permission];
        if (
            !doc.invited[subjectAccount].acc[ACCESS_ENUM.WRITE] &&
            !doc.invited[subjectAccount].acc[ACCESS_ENUM.DELEGATE]
        ) {
            uint256 index = doc.allInvitedIndex[subjectAccount];
            if (index > 0) {
                bytes memory lastAcc = doc.allInvited[
                    doc.allInvited.length - 1
                ];
                doc.allInvited[index] = lastAcc;
                doc.allInvited.pop();
                doc.allInvitedIndex[subjectAccount] = 0;
                doc.allInvitedIndex[lastAcc] = index;
            }
        }
        {
            uint256 index = accessBySubjectIndex[subjectAccount][documentHash];
            bytes32 lastElement = accessBySubject[subjectAccount][accessBySubject[subjectAccount].length - 1];
            accessBySubject[subjectAccount][index] = lastElement;
            accessBySubject[subjectAccount].pop();
            accessBySubjectIndex[subjectAccount][lastElement] = index;
        }
        emit AccessRevoked(documentHash, subjectAccount, revokeByAccount);
    }

    function writeEvent(
        WriteEvent calldata eventParams,
        bytes calldata writer
    ) external {
        // authorize signer
        if (
            _authorize(
                writer,
                documents[eventParams.documentHash].invited[writer].subjectAccountType
            ) == false
        ) {
            revert NotDidController();
        }
        if (
            _getAccountAccess(
                eventParams.documentHash,
                writer,
                documents[eventParams.documentHash]
                    .invited[writer]
                    .subjectAccountType,
                SCOPE.TNT_WRITE
            ) == false
        ) {
            revert OnlyCreatorOrWriter();
        }
        _writeEvent(eventParams, block.timestamp, Source.Block, bytes32(block.number));
    }

    function writeEvent(
        WriteEvent calldata eventParams,
        bytes calldata writer,
        uint256 timestamp,
        Source timestampSource,
        bytes32 timestampProof
    ) external {
        // authorize signer
        if (
            _authorize(
                writer,
                documents[eventParams.documentHash].invited[writer].subjectAccountType
            ) == false
        ) {
            revert NotDidController();
        }
        if (
            _getAccountAccess(
                eventParams.documentHash,
                writer,
                documents[eventParams.documentHash]
                    .invited[writer]
                    .subjectAccountType,
                SCOPE.TNT_WRITE
            ) == false
        ) {
            revert OnlyCreatorOrWriter();
        }
        _writeEvent(eventParams, timestamp, timestampSource, timestampProof);
    }

    function getImplementation() external view returns (address) {
        return _getImplementation();
    }

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

    function getDocument(
        bytes32 documentHash
    ) external view returns (DocumentGetter memory) {
        Document storage iDoc = documents[documentHash];
        DocumentGetter memory doc;
        doc.creator = iDoc.creator;
        doc.documentMetadata = iDoc.documentMetadata;
        doc.documentTimestamp = iDoc.documentTimestamp;
        doc.eventHashes = iDoc.eventHashes;
        return doc;
    }

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
        return documents[documentHash].eventHashes.paginate(page, pageSize);
    }

    function getEvent(
        bytes32 documentHash,
        bytes32 eventHash
    ) external view returns (Event memory) {
        Event memory ev = documents[documentHash].events[eventHash];
        return ev;
    }

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
        bytes[] storage invitedUsers = documents[documentHash].allInvited;
        return invitedUsers.paginate(page, pageSize);
    }

    function getAccessesBySubject(bytes calldata subject, uint256 page, uint256 pageSize) external view returns (
        bytes32[] memory items,
        uint256 total,
        uint256 howMany,
        uint256 prev,
        uint256 next
    ) {
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");
        return accessBySubject[subject].paginate(page, pageSize);
    }

    function isCreator(bytes calldata did) external view returns (bool) {
        return
            _getAccountAccess(
                bytes32(0),
                did,
                ACCOUNT_TYPE.DID_EBSI,
                SCOPE.TNT_CREATE
            );
    }

    function getGrantedBy (bytes32 docHash, bytes calldata did, ACCESS_ENUM[] calldata acc)
    external
    view
    returns (bytes[] memory, ACCOUNT_TYPE[] memory, bool[] memory) {
        if (acc.length == 0) {
            revert InvalidArrayLength();
        }
        uint256 accLength = acc.length;
        bytes[] memory grantedByAccounts = new bytes[](accLength);
        ACCOUNT_TYPE[] memory grantedByAccountType = new ACCOUNT_TYPE[](accLength);
        bool[] memory access = new bool[](accLength);
        Access_Struct storage accs = documents[docHash].invited[did];
        for (uint256 i = 0; i < accLength; i++) {
            grantedByAccounts[i] = accs.grantedBy[acc[i]];
            grantedByAccountType[i] = accs.grantedByAccountType[acc[i]];
            access[i] = accs.acc[acc[i]];
        }
        return (grantedByAccounts, grantedByAccountType, access);
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
            accessBySubject[creatorBytes].length == 0
            || accessBySubject[creatorBytes].length > 0 && accessBySubjectIndex[creatorBytes][documentHash] == 0
        ) {
            accessBySubject[creatorBytes].push(documentHash);
            accessBySubjectIndex[creatorBytes][documentHash] = accessBySubject[creatorBytes].length - 1;
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

        if (_document.allInvitedIndex[subjectAccount] == 0) {
            uint256 index = _document.allInvited.length;
            _document.allInvited.push(subjectAccount);
            _document.allInvitedIndex[subjectAccount] = index;
        }

        if (
            accessBySubject[subjectAccount].length == 0 ||
            accessBySubject[subjectAccount].length > 0 && accessBySubjectIndex[subjectAccount][documentHash] == 0
        ) {
            accessBySubject[subjectAccount].push(documentHash);
            accessBySubjectIndex[subjectAccount][documentHash] = accessBySubject[subjectAccount].length - 1;
        }

        emit AccessGranted(
            documentHash,
            subjectAccount,
            grantedByAccount,
            permission
        );
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
        Document storage _document = documents[eventParams.documentHash];
        _document.events[eventParams.eventHash].hash = eventParams.eventHash;
        _document.events[eventParams.eventHash].externalHash = eventParams
            .externalHash;
        _document.events[eventParams.eventHash].sender = eventParams.sender;
        _document.events[eventParams.eventHash].origin = eventParams.origin;
        _document.events[eventParams.eventHash].eventMetadata = eventParams
            .metadata;
        // add Timestamp
        Timestamp storage _timestamp = _document
            .events[eventParams.eventHash]
            .eventTimestamp;
        _timestamp.timestamp = timestamp;
        _timestamp.proof = timestampProof;
        _timestamp.source = timestampSource;

        // helpers

        _document.eventHashes.push(eventParams.eventHash);

        emit EventWritten(
            eventParams.documentHash,
            eventParams.eventHash,
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

    function _authorize (
        bytes memory account,
        ACCOUNT_TYPE accountType
    ) internal view returns (bool) {
        // authorise did:ebsi or did:key with msg.sender.
        return
        accountType == ACCOUNT_TYPE.DID_EBSI && didRegistry.checkController(account, msg.sender)
        || accountType == ACCOUNT_TYPE.DID_KEY && msg.sender == _getWalletAddressFromPublicKey(account);
    }

    function _getAccountAccess(
        bytes32 documentHash,
        bytes memory account,
        ACCOUNT_TYPE accountType,
        SCOPE scopeRequested
    ) internal view returns (bool) {

        if (scopeRequested == SCOPE.TNT_AUTHORIZE) {
            // scope to authoriseDid, doesn't refer to the document, it is a general scope
            if (accountType == ACCOUNT_TYPE.DID_EBSI) {
                return true;
            }
        }

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

    function _getWalletAddressFromPublicKey(
        bytes memory publicKey
    ) internal pure returns (address) {
        return address(uint160(uint256(keccak256(publicKey))));
    }

    /*
    Function: equal(bytes memory, bytes memory)

    Assert that two tightly packed bytes arrays are equal.

    Params:
        A (bytes) - The first bytes.
        B (bytes) - The second bytes.
        message (string) - A message that is sent if the assertion fails.

    Returns:
        result (bool) - The result.
    */
    function _equal(
        bytes memory _a,
        bytes memory _b
    ) internal pure returns (bool) {
        bool returnBool = true;

        assembly {
            let length := mload(_a)

            // if lengths don't match the arrays are not equal
            switch eq(length, mload(_b))
            case 1 {
                // cb is a circuit breaker in the for loop since there's
                //  no said feature for inline assembly loops
                // cb = 1 - don't breaker
                // cb = 0 - break
                let cb := 1

                let mc := add(_a, 0x20)
                let end := add(mc, length)

                for {
                    let cc := add(_b, 0x20)
                    // the next line is the loop condition:
                    // while(uint256(mc < end) + cb == 2)
                } eq(add(lt(mc, end), cb), 2) {
                    mc := add(mc, 0x20)
                    cc := add(cc, 0x20)
                } {
                    // if any of these checks fails then arrays are not equal
                    if iszero(eq(mload(mc), mload(cc))) {
                        // unsuccess:
                        returnBool := 0
                        cb := 0
                    }
                }
            }
            default {
                // unsuccess:
                returnBool := 0
            }
        }

        return returnBool;
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
