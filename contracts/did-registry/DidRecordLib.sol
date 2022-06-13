// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;
import "./DidRecordStorage.sol";
import "./DidTimestampLib.sol";
import "./DidTimestampStorage.sol";

library DidRecordLib {
    using Pagination for bytes32[];
    using Pagination for bytes[];
    using DidTimestampLib for DidTimestampStorage.DidTimestamps;

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
        DidRecordStorage.DidRecords storage rs,
        bytes calldata identifier,
        bytes32 timestampId,
        bytes calldata didVersionInfo,
        bytes calldata didVersionMetadata
    ) external returns (bytes32 recordId) {
        require(didVersionInfo.length > 0, "didVersionInfo empty");
        require(identifier.length > 0, "identifier empty");
        //Compute record unique id as  SHA2-256(did)
        recordId = sha256(identifier);
        DidRecordStorage.DidRecord storage r = rs.didRecordsStore[recordId];
        require(r.totalDidVersions == 0, "record exists");
        rs.didRecordIdentifiersList.push(identifier);
        r.didIdentifier = identifier;
        r.controllerIds.push(msg.sender);
        r.didTimestampIdToVersionId[timestampId] = 1;
        r.totalDidVersions = 1;

        rs.didTimestampIdToDidRecordId[timestampId].push(recordId);
        DidRecordStorage.DidVersionDetails storage vd = r.didVersionsStore[1];
        vd.didTimestampsId.push(timestampId);

        if (didVersionInfo.length > 0) {
            vd.didVersionInfoId.push(sha256(didVersionInfo));
            rs.didVersionInfoStore[sha256(didVersionInfo)] = didVersionInfo;
            rs.didVersionInfoIdToVersionId[sha256(didVersionInfo)] = 1;
        }
        if (didVersionMetadata.length > 0) {
            vd.didVersionMetadataId.push(sha256(didVersionMetadata));
            rs.didVersionMetadataStore[
                sha256(didVersionMetadata)
            ] = didVersionMetadata;
            rs.didVersionMetadataIdToVersionId[sha256(didVersionMetadata)] = 1;
        }
        rs.controllerIdToDidRecordId[msg.sender].push(recordId);
        rs.controllerIdToDidRecordIdentifiers[msg.sender].push(identifier);
        rs.didTimestampIdToDidRecordId[timestampId].push(recordId);

        emit DidDocumentInserted(
            recordId,
            timestampId,
            sha256(didVersionInfo),
            sha256(didVersionMetadata)
        );
        return recordId;
    }

    /**
     * @dev  updateDidDocument enables subjects to update an existing DID Document they control,
     *       by adding a new version of the DID Document.
     */
    function updateDidDocument(
        DidRecordStorage.DidRecords storage rs,
        bytes calldata identifier,
        bytes32 timestampId,
        bytes calldata didVersionInfo,
        bytes calldata didVersionMetadata
    ) external returns (bytes32 recordId) {
        require(didVersionInfo.length > 0, "didVersionInfo empty");
        require(identifier.length > 0, "identifier empty");
        //Compute record unique id as  SHA2-256(did)
        recordId = sha256(identifier);

        DidRecordStorage.DidRecord storage r = rs.didRecordsStore[recordId];
        require(r.totalDidVersions != 0, "record unknown");
        require(
            checkIfControllerExists(msg.sender, r.controllerIds),
            "ctrl unknown"
        );
        require(!r.controllersStore[msg.sender].revoked, "ctrl revoked");
        r.totalDidVersions++;
        r.didTimestampIdToVersionId[timestampId] = r.totalDidVersions;

        DidRecordStorage.DidVersionDetails storage vd = r.didVersionsStore[
            r.totalDidVersions
        ];
        vd.didTimestampsId.push(timestampId);
        vd.didVersionInfoId.push(sha256(didVersionInfo));
        vd.didVersionMetadataId.push(sha256(didVersionMetadata));

        if (didVersionInfo.length > 0) {
            rs.didVersionInfoStore[sha256(didVersionInfo)] = didVersionInfo;
        }
        if (didVersionMetadata.length > 0) {
            rs.didVersionMetadataStore[
                sha256(didVersionMetadata)
            ] = didVersionMetadata;
        }
        rs.didTimestampIdToDidRecordId[timestampId].push(recordId);
        rs.didVersionInfoIdToVersionId[sha256(didVersionInfo)] = r
            .totalDidVersions;
        rs.didVersionMetadataIdToVersionId[sha256(didVersionMetadata)] = r
            .totalDidVersions;
        emit DidDocumentUpdated(
            recordId,
            timestampId,
            sha256(didVersionInfo),
            sha256(didVersionMetadata)
        );
    }

    function checkIfControllerExists(address ctrlId, address[] memory ctrlIds)
        internal
        pure
        returns (bool)
    {
        for (uint256 i = 0; i < ctrlIds.length; i++) {
            if (ctrlIds[i] == ctrlId) {
                return true;
            }
        }
        return false;
    }

    function replaceAddressFromArray(
        address[] storage array,
        address existingElement,
        address newElement
    ) internal returns (bool) {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == existingElement) {
                array[i] = newElement;
                return true;
            }
        }
        return false;
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
        DidRecordStorage.DidRecords storage rs,
        bytes calldata identifier,
        address newControllerId,
        uint256 notBefore,
        uint256 notAfter
    ) external {
        require(identifier.length > 0, "identifier empty");

        //Compute record unique id as  SHA2-256(did)
        bytes32 recordId = sha256(identifier);

        DidRecordStorage.DidRecord storage r = rs.didRecordsStore[recordId];
        require(r.totalDidVersions != 0, "record unknown");
        require(
            checkIfControllerExists(msg.sender, r.controllerIds),
            "ctrl unknown"
        );
        require(!r.controllersStore[msg.sender].revoked, "ctrl revoked");
        r.controllerIds.push(newControllerId);
        r.controllersStore[msg.sender] = DidRecordStorage.ControllerInfo(
            notBefore,
            notAfter,
            false
        );
        rs.controllerIdToDidRecordId[newControllerId].push(recordId);
        rs.controllerIdToDidRecordIdentifiers[newControllerId].push(identifier);
        emit DidControllerInserted(
            recordId,
            newControllerId,
            msg.sender,
            notBefore,
            notAfter
        );
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
        DidRecordStorage.DidRecords storage rs,
        bytes calldata identifier,
        address newControllerId,
        uint256 notBefore,
        uint256 notAfter
    ) external returns (bytes32 recordId) {
        require(identifier.length > 0, "identifier empty");

        //Compute record unique id as  SHA2-256(did)
        recordId = sha256(identifier);

        DidRecordStorage.DidRecord storage r = rs.didRecordsStore[recordId];
        require(r.totalDidVersions != 0, "record unknown");
        require(
            checkIfControllerExists(msg.sender, r.controllerIds),
            "ctrl unknown"
        );
        require(!r.controllersStore[msg.sender].revoked, "ctrl revoked");
        //Remove and replace the existing controllerId
        require(
            replaceAddressFromArray(
                r.controllerIds,
                msg.sender,
                newControllerId
            ),
            "ctrlIds update fail"
        );
        r.revokedControllerIdsToBlockNum[msg.sender] = block.number;
        r.controllersStore[msg.sender].revoked = true;
        //Remove and replace the existing controllerId
        require(
            removeFromArray(rs.controllerIdToDidRecordId[msg.sender], recordId),
            "ctrlToRecId remove fail"
        );
        require(
            removeFromArray(
                rs.controllerIdToDidRecordIdentifiers[msg.sender],
                identifier
            ),
            "ctrlToRecIdent remove fail"
        );
        rs.controllerIdToDidRecordId[newControllerId].push(recordId);
        rs.controllerIdToDidRecordIdentifiers[newControllerId].push(identifier);
        r.controllersStore[newControllerId] = DidRecordStorage.ControllerInfo(
            notBefore,
            notAfter,
            false
        );

        emit DidControllerUpdated(
            recordId,
            newControllerId,
            msg.sender,
            notBefore,
            notAfter
        );
    }

    function removeFromArray(
        address[] storage array,
        address elementToBeRemoved
    ) internal returns (bool) {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == elementToBeRemoved) {
                array[i] = array[array.length - 1];
                array.pop();
                return true;
            }
        }
        return false;
    }

    function removeFromArray(
        bytes32[] storage array,
        bytes32 elementToBeRemoved
    ) internal returns (bool) {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == elementToBeRemoved) {
                array[i] = array[array.length - 1];
                array.pop();
                return true;
            }
        }
        return false;
    }

    function removeFromArray(
        bytes[] storage array,
        bytes memory elementToBeRemoved
    ) internal returns (bool) {
        for (uint256 i = 0; i < array.length; i++) {
            if (keccak256(array[i]) == keccak256(elementToBeRemoved)) {
                array[i] = array[array.length - 1];
                array.pop();
                return true;
            }
        }
        return false;
    }

    /**
     * @dev revokeDidController enables to revoke an existing controller
     *      address that controls the didRecord in the SC for a specific identifier(DID).
     *      Only an existing controller address that will sign the transaction will
     *      be able to revoke an existing controller of a DID. At least one controller
     *      must stay on the didRecord.
     */
    function revokeDidController(
        DidRecordStorage.DidRecords storage rs,
        bytes calldata identifier,
        address oldControllerId
    ) external {
        require(identifier.length > 0, "identifier empty");
        //Compute record unique id as  SHA2-256(did)
        bytes32 recordId = sha256(identifier);

        DidRecordStorage.DidRecord storage r = rs.didRecordsStore[recordId];
        require(r.totalDidVersions != 0, "record unknown");
        require(
            checkIfControllerExists(msg.sender, r.controllerIds),
            "ctrl unknown"
        );
        require(!r.controllersStore[msg.sender].revoked, "ctrl revoked");
        // Check that the oldControllerId is not equal to the address of the transaction signer
        require(msg.sender != oldControllerId, "ctrl eq msg.sender");

        //Check that is not the last controller presents in didRecordsStore.controllerIds.
        require(
            !(msg.sender == r.controllerIds[0] && r.controllerIds.length == 1),
            "msg.sender is last ctrl"
        );
        require(
            removeFromArray(r.controllerIds, oldControllerId),
            "can't remove ctrlId"
        );
        r.revokedControllerIdsToBlockNum[oldControllerId] = block.number;
        r.controllersStore[oldControllerId].revoked = true;

        require(
            removeFromArray(
                rs.controllerIdToDidRecordId[oldControllerId],
                recordId
            ),
            "can't remove recId"
        );
        require(
            removeFromArray(
                rs.controllerIdToDidRecordIdentifiers[oldControllerId],
                identifier
            ),
            "can't remove recIdent"
        );

        emit DidRecordOwnerRevoked(recordId, oldControllerId, msg.sender);
    }

    /**
     * @dev  appendDidDocumentVersionHash enables to append a new type of hash for given DID Doc version.
     *       The method will timestamp the hash and add them to the didRecord,
     *       under the good version. This enables a user to add a more robust
     *       hash value for an existing DID Document version, if in the future
     *       new hash algorithm provide more security.
     */
    function appendDidDocumentVersionHash(
        DidRecordStorage.DidRecords storage rs,
        bytes calldata identifier,
        bytes32 timestampId,
        bytes calldata didVersionInfo
    ) external {
        require(identifier.length > 0, "identifier empty");
        require(didVersionInfo.length > 0, "versionInfo empty");
        //Compute record unique id as  SHA2-256(did)
        bytes32 recordId = sha256(identifier);

        DidRecordStorage.DidRecord storage r = rs.didRecordsStore[recordId];
        require(r.totalDidVersions != 0, "record unknown");
        require(
            checkIfControllerExists(msg.sender, r.controllerIds),
            "ctrl unknown"
        );
        require(!r.controllersStore[msg.sender].revoked, "ctrl revoked");
        require(
            rs.didVersionInfoIdToVersionId[sha256(didVersionInfo)] > 0,
            "versionInfo unknown"
        );

        r
            .didVersionsStore[
                rs.didVersionInfoIdToVersionId[sha256(didVersionInfo)]
            ]
            .didTimestampsId
            .push(timestampId);

        r
            .didVersionsStore[
                rs.didVersionInfoIdToVersionId[sha256(didVersionInfo)]
            ]
            .didVersionInfoId
            .push(sha256(didVersionInfo));
        rs.didVersionInfoStore[sha256(didVersionInfo)] = didVersionInfo;
        rs.didTimestampIdToDidRecordId[timestampId].push(recordId);
        emit DidDocumentVersionHashAppended(
            recordId,
            timestampId,
            didVersionInfo
        );
    }

    /**
     * @dev detachDidDocumentVersionHash detaches an existing hash for a given DID Doc version.
     */
    function detachDidDocumentVersionHash(
        DidRecordStorage.DidRecords storage rs,
        DidTimestampStorage.DidTimestamps storage ts,
        HashAlgoStorage.HashAlgos storage hs,
        bytes calldata identifier,
        uint256 hashAlgorithmId,
        bytes calldata hashValue,
        bytes calldata didVersionInfo
    ) external {
        require(identifier.length > 0, "identifier empty");
        require(didVersionInfo.length > 0, "versionInfo empty");
        require(hashValue.length > 0, "hashValue empty");
        require(
            hs.infoStore[hashAlgorithmId].outputLength > 0,
            "hashAlgo unknown"
        );
        require(
            hs.infoStore[hashAlgorithmId].outputLength == hashValue.length * 8,
            "invalid hash length"
        );

        //Compute record unique id as  SHA2-256(did)
        bytes32 recordId = sha256(identifier);

        DidRecordStorage.DidRecord storage r = rs.didRecordsStore[recordId];
        require(r.totalDidVersions != 0, "record unknown");
        require(
            checkIfControllerExists(msg.sender, r.controllerIds),
            "ctrl unknown"
        );
        require(!r.controllersStore[msg.sender].revoked, "ctrl revoked");
        require(
            rs.didVersionInfoIdToVersionId[sha256(didVersionInfo)] > 0,
            "versionInfo unknown"
        );

        require(
            ts.didTimestampsStore[sha256(hashValue)].hash.value.length > 0,
            "hash unknown"
        );
        require(
            r
                .didVersionsStore[
                    rs.didVersionInfoIdToVersionId[sha256(didVersionInfo)]
                ]
                .didTimestampsId
                .length > 1,
            "last tsId"
        );
        require(
            removeFromArray(
                r
                    .didVersionsStore[
                        rs.didVersionInfoIdToVersionId[sha256(didVersionInfo)]
                    ]
                    .didTimestampsId,
                sha256(hashValue)
            ),
            "can't remove tsId"
        );
        // Remove didTimestampId from didRecordsStore[sha2-256(identifier)].didTimestampIdToVersionId
        r.didTimestampIdToVersionId[sha256(hashValue)] = 0;
        // Add the didVersionInfo in the didVersionInfoStore with
        // key = sha2-256(didVersionInfo) and value = didVersionInfo
        rs.didVersionInfoStore[sha256(didVersionInfo)] = didVersionInfo;

        require(
            removeFromArray(
                rs.didTimestampIdToDidRecordId[sha256(hashValue)],
                recordId
            ),
            "can't remove recordId"
        );
        emit DidDocumentVersionHashDetached(
            recordId,
            hashValue,
            didVersionInfo
        );
    }

    /**
     * @dev  appendDidDocumentVersionMetadata enables to append a new metadata for given DID Doc version.
     */
    function appendDidDocumentVersionMetadata(
        DidRecordStorage.DidRecords storage rs,
        bytes calldata identifier,
        bytes calldata didVersionInfo,
        bytes calldata didVersionMetadata
    ) external {
        require(identifier.length > 0, "identifier empty");
        require(didVersionInfo.length > 0, "versionInfo empty");
        require(didVersionMetadata.length > 0, "versionMetaData empty");
        //Compute record unique id as  SHA2-256(did)
        bytes32 recordId = sha256(identifier);

        DidRecordStorage.DidRecord storage r = rs.didRecordsStore[recordId];
        require(r.totalDidVersions != 0, "record unknown");
        require(
            checkIfControllerExists(msg.sender, r.controllerIds),
            "ctrl unknown"
        );
        require(!r.controllersStore[msg.sender].revoked, "ctrl revoked");

        require(
            rs.didVersionInfoIdToVersionId[sha256(didVersionInfo)] > 0,
            "versionInfo unknown"
        );

        r
            .didVersionsStore[
                rs.didVersionInfoIdToVersionId[sha256(didVersionInfo)]
            ]
            .didVersionMetadataId
            .push(sha256(didVersionMetadata));
        rs.didVersionMetadataStore[
            sha256(didVersionMetadata)
        ] = didVersionMetadata;
        emit DidDocumentVersionMetadataAppended(
            recordId,
            didVersionMetadata,
            didVersionInfo
        );
        rs.didVersionMetadataIdToVersionId[sha256(didVersionMetadata)] = rs
            .didVersionInfoIdToVersionId[sha256(didVersionInfo)];
    }

    /**
     * @dev detachDidDocumentVersionMetadata detaches an existing metadata for a given DID Doc version.
     */
    function detachDidDocumentVersionMetadata(
        DidRecordStorage.DidRecords storage rs,
        bytes calldata identifier,
        bytes calldata didVersionInfo,
        bytes calldata didVersionMetadata
    ) external {
        require(identifier.length > 0, "identifier empty");
        require(didVersionInfo.length > 0, "versionInfo empty");
        require(didVersionMetadata.length > 0, "versionMetaData empty");
        //Compute record unique id as  SHA2-256(did)
        bytes32 recordId = sha256(identifier);

        DidRecordStorage.DidRecord storage r = rs.didRecordsStore[recordId];
        require(r.totalDidVersions != 0, "record unknown");
        require(
            checkIfControllerExists(msg.sender, r.controllerIds),
            "ctrl unknown"
        );
        require(!r.controllersStore[msg.sender].revoked, "ctrl revoked");
        require(
            rs.didVersionInfoIdToVersionId[sha256(didVersionInfo)] > 0,
            "versionInfo unknown"
        );
        require(
            removeFromArray(
                r
                    .didVersionsStore[
                        rs.didVersionInfoIdToVersionId[sha256(didVersionInfo)]
                    ]
                    .didVersionMetadataId,
                sha256(didVersionMetadata)
            ),
            "can't remove version metadata"
        );

        rs.didVersionMetadataIdToVersionId[sha256(didVersionMetadata)] = 0;
        emit DidDocumentVersionMetadataDetached(
            recordId,
            didVersionMetadata,
            didVersionInfo
        );
    }

    /**
     * @dev getDidRecordIdentifiers returns a paginated list of  didRecords identifiers from didRecordIdentifiersList.
     */
    function getDidRecordIdentifiers(
        DidRecordStorage.DidRecords storage rs,
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
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");

        return rs.didRecordIdentifiersList.paginate(page, pageSize);
    }

    /**
     * @dev getDidRecordIdentifiersByControllerId returns a paginated list of
     * didRecords identifiers owned by controllerId.
     */
    function getDidRecordIdentifiersByControllerId(
        DidRecordStorage.DidRecords storage rs,
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
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");

        return
            rs.controllerIdToDidRecordIdentifiers[controllerId].paginate(
                page,
                pageSize
            );
    }

    /**
     * @dev getDidRecordIdsByControllerId returns a paginated list of  didRecords identifiers owned by controllerId.
     */
    function getDidRecordIdsByControllerId(
        DidRecordStorage.DidRecords storage rs,
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
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");

        return
            rs.controllerIdToDidRecordId[controllerId].paginate(page, pageSize);
    }

    /**
     * @dev getLatestDidDocumentVersion returns for a specific identifier
     * (did), the didVersionInfo for the latest version of the DID Document.
     */
    function getLatestDidDocumentVersion(
        DidRecordStorage.DidRecords storage rs,
        bytes calldata identifier
    ) public view returns (bytes memory) {
        require(identifier.length > 0, "identifier empty");
        //Compute record unique id as  SHA2-256(did)
        bytes32 recordId = sha256(identifier);

        DidRecordStorage.DidRecord storage r = rs.didRecordsStore[recordId];
        require(r.totalDidVersions != 0, "record unknown");
        bytes32[] storage didVersionInfoIds = r
            .didVersionsStore[r.totalDidVersions]
            .didVersionInfoId;
        bytes32 latestDidVersionInfoId = didVersionInfoIds[
            didVersionInfoIds.length - 1
        ];
        return rs.didVersionInfoStore[latestDidVersionInfoId];
    }

    /**
     * @dev getDidRecord returns information about a specific identifier (did)
     */
    function getDidRecord(
        DidRecordStorage.DidRecords storage rs,
        bytes calldata identifier
    )
        public
        view
        returns (address[] memory controllerIds, uint256 totalDidVersions)
    {
        require(identifier.length > 0, "identifier empty");
        //Compute record unique id as  SHA2-256(did)
        bytes32 recordId = sha256(identifier);

        DidRecordStorage.DidRecord storage r = rs.didRecordsStore[recordId];
        require(r.totalDidVersions != 0, "record unknown");
        totalDidVersions = r.totalDidVersions;
        controllerIds = r.controllerIds;
    }

    /**
     * @dev getDidRecordById returns information about a specific identifier (did)
     */
    function getDidRecordById(
        DidRecordStorage.DidRecords storage rs,
        bytes32 recordId
    )
        public
        view
        returns (
            bytes memory identifier,
            address[] memory controllerIds,
            uint256 totalDidVersions
        )
    {
        require(recordId != bytes32(0), "recordId empty");

        DidRecordStorage.DidRecord storage r = rs.didRecordsStore[recordId];
        require(r.totalDidVersions != 0, "record unknown");
        identifier = r.didIdentifier;
        totalDidVersions = r.totalDidVersions;
        controllerIds = r.controllerIds;
    }

    function concatenateArrays(bytes32[] memory arr1, bytes32[] memory arr2)
        internal
        pure
        returns (bytes32[] memory)
    {
        bytes32[] memory returnArr = new bytes32[](arr1.length + arr2.length);
        uint256 i = 0;
        for (; i < arr1.length; i++) {
            returnArr[i] = arr1[i];
        }

        uint256 j = 0;
        while (j < arr2.length) {
            returnArr[i + j] = arr2[j];
            j++;
        }
        return returnArr;
    }

    /**
     * @dev getDidDocumentVersionIds returns a paginated list of didVersionInfoId(s) for a specific identifier
     */
    function getDidDocumentVersionIds(
        DidRecordStorage.DidRecords storage rs,
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
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");
        require(identifier.length > 0, "identifier empty");
        //Compute record unique id as  SHA2-256(did)
        bytes32 recordId = sha256(identifier);

        DidRecordStorage.DidRecord storage r = rs.didRecordsStore[recordId];
        require(r.totalDidVersions != 0, "record unknown");
        bytes32[] memory returnArr = new bytes32[](0);
        for (uint256 i = 1; i <= r.totalDidVersions; i++) {
            returnArr = concatenateArrays(
                returnArr,
                r.didVersionsStore[i].didVersionInfoId
            );
        }
        return returnArr.paginate(page, pageSize);
    }

    /**
     * @dev getDidDocumentVersionInfo returns version info by didVersionInfoId
     */
    function getDidDocumentVersionInfo(
        DidRecordStorage.DidRecords storage rs,
        bytes32 didVersionInfoId
    ) public view returns (bytes memory) {
        return rs.didVersionInfoStore[didVersionInfoId];
    }

    /**
     * @dev getDidDocumentVersionMetadataIds returns a paginated list of
     *      didVersionMetadataId(s) for a specific identifier and a specific didVersionInfoId
     */
    function getDidDocumentVersionMetadataIds(
        DidRecordStorage.DidRecords storage rs,
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
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");
        require(identifier.length > 0, "identifier empty");
        require(didVersionInfoId != bytes32(0), "versionInfoId empty");
        //Compute record unique id as  SHA2-256(did)

        require(
            rs.didRecordsStore[sha256(identifier)].totalDidVersions != 0,
            "record unknown"
        );

        return
            rs
                .didRecordsStore[sha256(identifier)]
                .didVersionsStore[
                    rs.didVersionInfoIdToVersionId[didVersionInfoId]
                ]
                .didVersionMetadataId
                .paginate(page, pageSize);
    }

    /**
     * @dev getDidDocumentVersionMetadata returns version metadata by
     * didVersionMetadataId from the didVersionMetadataStore
     */
    function getDidDocumentVersionMetadata(
        DidRecordStorage.DidRecords storage rs,
        bytes32 didVersionMetadataId
    ) public view returns (bytes memory) {
        return rs.didVersionMetadataStore[didVersionMetadataId];
    }

    /**
     * @dev getDidDocumentVersionDidTimestampIds returns version didTimestampIds
     */
    function getDidDocumentVersionDidTimestampIds(
        DidRecordStorage.DidRecords storage rs,
        bytes calldata identifier,
        uint256 versionId
    ) public view returns (bytes32[] memory) {
        require(identifier.length > 0, "identifier empty");

        //Compute record unique id as  SHA2-256(did)
        bytes32 recordId = sha256(identifier);
        DidRecordStorage.DidRecord storage r = rs.didRecordsStore[recordId];
        require(r.totalDidVersions > 0, "record unknown");
        require(r.totalDidVersions >= versionId, "unknown version");

        return
            rs
                .didRecordsStore[recordId]
                .didVersionsStore[versionId]
                .didTimestampsId;
    }

    /**
     * @dev checkController returns true if the 'ctrl' is in the list
     * of controllers of the 'identifier'
     */
    function checkController(
        DidRecordStorage.DidRecords storage rs,
        bytes calldata identifier,
        address ctrl
    ) external view returns (bool) {
        bytes32 recordId = sha256(identifier);
        DidRecordStorage.DidRecord storage r = rs.didRecordsStore[recordId];
        require(r.totalDidVersions != 0, "record unknown");
        return checkIfControllerExists(ctrl, r.controllerIds);
    }
}
