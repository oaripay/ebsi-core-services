// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

// solhint-disable-next-line max-line-length
import "./IssuerStorage.sol";
import "@ebsiint-sc/bootstrap/contracts/utils/Pagination.sol";

// solhint-disable-next-line indent
abstract contract IssuerDetailed is IssuerStorage {
    using Pagination for bytes32[];
    using Pagination for string[];

    event AddIssuerAttribute(
        bytes32 indexed didHash,
        bytes32 indexed firstAttrHash,
        string did,
        uint256 attributeVersionCount,
        uint256 attributesCount
    );
    event UpdateIssuerAttribute(
        bytes32 indexed didHash,
        bytes32 indexed newAttrHash,
        bytes32 indexed previousAttrHash,
        bytes32 firstAttrHash,
        string did,
        uint256 attributeVersionCount,
        uint256 attributesCount
    );
    event AddIssuerProxy(string did, bytes32 indexed proxyId);
    event UpdateIssuerProxy(string did, bytes32 indexed proxyId);

    /**
     * @dev insert an Issuer with TAO
     */
    function insertIssuer(
        string calldata did,
        bytes calldata attributeData,
        IssuerType issuerType,
        string calldata taoDid,
        bytes32 attributeIdTao
    ) external {
        bytes32 firstAttrHash = sha256(attributeData);

        checkInsertIssuerCondition(did, firstAttrHash);
        (string memory _taoDid, string memory _rootTaoDid) = getTaoAndRootTao(
            did,
            issuerType,
            taoDid,
            attributeIdTao
        );

        // store a link between this hash to the did to easily retrieve it
        insertIssuerAddAttributeMetadata(
            did,
            firstAttrHash,
            issuerType,
            _taoDid,
            _rootTaoDid
        );

        insertRevisionAndAttributes(did, firstAttrHash, attributeData);
    }

    /**
     * @dev add a new issuer's attribute with TAO
     */
    function updateIssuer(
        string calldata did,
        bytes calldata attributeData,
        IssuerType issuerType,
        string calldata taoDid,
        bytes32 attributeTaoDidId
    ) external {
        assert(issuerType != IssuerType.Undefined);
        // get latest getLatestRevisionAttributeId for taoattribute id
        bytes32 latestRevisionAttributeTaoDidId = getLatestRevisionAttributeId(
            taoDid,
            attributeTaoDidId
        );
        checkEligibilityAddAttribute(
            did,
            taoDid,
            latestRevisionAttributeTaoDidId,
            issuerType
        );
        bytes32 newAttrHash = sha256(attributeData);
        checkNewAttributeHash(did, newAttrHash);

        // store a link between this hash to the did to easily retrieve it
        string memory _rootTaoDid = getRootTaoDid(
            latestRevisionAttributeTaoDidId
        );

        saveMetadata(did, attributeData, issuerType, taoDid, _rootTaoDid);

        emitUpdateIssuer(did, newAttrHash, newAttrHash, newAttrHash);
    }

    /**
     * @dev add a new version to a issuer's attribute with TAO
     */
    function updateIssuer(
        string calldata did,
        bytes calldata attributeData,
        bytes32 lastVersHash,
        IssuerType issuerType,
        string calldata taoDid,
        bytes32 attributeIdTao
    ) external {
        assert(issuerType != IssuerType.Undefined);
        bytes32 latestRevisionAttributeId = getLatestRevisionAttributeId(
            did,
            lastVersHash
        );
        // based on the last version hash we can retrive the first version hash for this attribute along with the did
        bytes32 newAttrHash = sha256(attributeData);
        bytes32 firstAttrHash = computeFirstAttrHash(
            lastVersHash,
            newAttrHash,
            did
        );
        checkEligibilityUpdateAttribute(
            did,
            taoDid,
            latestRevisionAttributeId,
            issuerType
        );

        // store a link between this hash, the first hash and the did to easily retrieve it

        string memory _rootTaoDid = getRootTaoDid(attributeIdTao);
        // save into memory
        insertMetadata(
            did,
            firstAttrHash,
            issuerType,
            taoDid,
            _rootTaoDid,
            newAttrHash
        );
        addRevision(did, firstAttrHash, newAttrHash, attributeData);
        emitUpdateIssuer(did, newAttrHash, lastVersHash, firstAttrHash);
    }

    function emitUpdateIssuer(
        string memory did,
        bytes32 newAttrHash,
        bytes32 lastVersHash,
        bytes32 firstAttrHash
    ) internal {
        Issuers storage ds = issuerStorage();
        Entity storage iss = ds.issuerStore[did];
        AttributeDetails storage atr = iss.attributesStore[firstAttrHash];
        uint256 attributeVersionCount = atr.revisionHashes.length;
        uint256 attributesCount = iss.attributes.length;
        emit UpdateIssuerAttribute(
            sha256(bytes(did)),
            newAttrHash,
            lastVersHash,
            firstAttrHash,
            did,
            attributeVersionCount,
            attributesCount
        );
    }

    function getIssuer(
        string memory did
    ) public view returns (bytes32[] memory) {
        Issuers storage ds = issuerStorage();
        bytes32[] memory attributesFirstHash = ds.issuerStore[did].attributes;
        require(attributesFirstHash.length > 0, "issuer does not exist");
        bytes32[] memory attributesLastHash = new bytes32[](
            attributesFirstHash.length
        );
        //list all the attributes
        for (uint256 index = 0; index < attributesFirstHash.length; index++) {
            // get all the versions for the current attribute
            bytes32[] memory versions = ds
                .issuerStore[did]
                .attributesStore[attributesFirstHash[index]]
                .revisionHashes;

            //get the last version hash for this attribute
            attributesLastHash[index] = versions[versions.length - 1];
        }
        return attributesLastHash;
    }

    function getIssuers(
        uint256 page,
        uint256 pageSize
    )
        public
        view
        returns (
            string[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        require(pageSize <= 50, "PageSize must be <= 50");
        require(pageSize > 0, "PageSize must be > 0");
        require(page > 0, "Page must be > 0");
        Issuers storage ds = issuerStorage();
        return ds.didStore.paginate(page, pageSize);
    }

    function getIssuerAttributeRevisions(
        bytes32 anyAttrVersHash,
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
        require(pageSize <= 50, "PageSize must be <= 50");
        require(pageSize > 0, "PageSize must be > 0");
        require(page > 0, "Page must be > 0");
        Issuers storage ds = issuerStorage();
        // retrieve first the did and attrId (firstHash of attribute)
        AttributeMetadata memory am = ds.attributeMetadataStore[
            anyAttrVersHash
        ];
        require(
            keccak256(bytes(am.did)) != keccak256(bytes("")),
            "attribute has not been found"
        );

        // retrieve the issuer and the attribute detail
        return
            ds
                .issuerStore[am.did]
                .attributesStore[am.attributeId]
                .revisionHashes
                .paginate(page, pageSize);
    }

    function getIssuerAttributeByHash(
        bytes32 anyAttrVersHash
    )
        public
        view
        returns (
            string memory did,
            bytes memory attribData,
            string memory tao,
            string memory rootTao,
            IssuerType issuerType
        )
    {
        Issuers storage ds = issuerStorage();
        // retrieve first the did and attrId (firstHash of attribute)
        AttributeMetadata memory i = ds.attributeMetadataStore[anyAttrVersHash];
        require(
            keccak256(bytes(i.did)) != keccak256(bytes("")),
            "attribute has not been found"
        );
        did = i.did;
        // retrieve the issuer and the attribute detail
        Entity storage iss = ds.issuerStore[i.did];
        attribData = iss.revisions[anyAttrVersHash];
        tao = i.taoDid;
        rootTao = i.rootTaoDid;
        issuerType = i.issuerType;
    }

    /**
     * @dev Add a proxy record to an issuer.
     */
    function addIssuerProxy(
        string calldata did,
        string calldata proxyData
    ) external {
        Issuers storage ds = issuerStorage();

        require(
            ds.trustedPolicyRegistry.checkPolicy(
                "TIR:updateIssuer",
                msg.sender
            ) || checkController(bytes(did), msg.sender),
            string(
                abi.encodePacked(
                    "Policy error: sender is not controller of the did ",
                    did,
                    " and it doesn't have the attribute TIR:updateIssuer"
                )
            )
        );

        bytes32 proxyId = sha256(bytes(proxyData));
        Entity storage iss = ds.issuerStore[did];

        iss.proxies.push(proxyId);
        iss.proxiesStore[proxyId] = proxyData;
        emit AddIssuerProxy(did, proxyId);
    }

    /**
     * @dev Update a given issuer proxy.
     */
    function updateIssuerProxy(
        string calldata did,
        bytes32 proxyId,
        string calldata proxyData
    ) external {
        Issuers storage ds = issuerStorage();

        require(
            ds.trustedPolicyRegistry.checkPolicy(
                "TIR:updateIssuer",
                msg.sender
            ) || checkController(bytes(did), msg.sender),
            string(
                abi.encodePacked(
                    "Policy error: sender is not controller of the did ",
                    did,
                    " and it doesn't have the attribute TIR:updateIssuer"
                )
            )
        );

        Entity storage iss = ds.issuerStore[did];

        iss.proxiesStore[proxyId] = proxyData;
        emit UpdateIssuerProxy(did, proxyId);
    }

    /**
     * @dev Get proxy data by its id/hash.
     */
    function getIssuerProxyById(
        string memory did,
        bytes32 proxyId
    ) public view returns (string memory proxyData) {
        Issuers storage ds = issuerStorage();
        return ds.issuerStore[did].proxiesStore[proxyId];
    }

    /**
     * @dev Return the list of proxies of a given issuer.
     */
    function getIssuerProxies(
        string memory did
    ) public view returns (bytes32[] memory) {
        Issuers storage ds = issuerStorage();
        return ds.issuerStore[did].proxies;
    }

    function compareStrings(
        string memory str1,
        string memory str2
    ) internal pure returns (bool) {
        return
            keccak256(abi.encodePacked(str1)) ==
            keccak256(abi.encodePacked(str2));
    }

    function checkEligibilityAddAttribute(
        string calldata did,
        string calldata taoDid,
        bytes32 taoDidHashId,
        IssuerType issuerType
    ) internal {
        Issuers storage ds = issuerStorage();
        Entity storage iss = ds.issuerStore[did];
        require(iss.attributes.length > 0, "issuer does not exist");
        AttributeMetadata memory taoAttrMetadata = ds.attributeMetadataStore[
            taoDidHashId
        ];
        if (issuerType == IssuerType.RootTAO) {
            require(
                ds.trustedPolicyRegistry.checkPolicy(
                    "TIR:updateIssuer",
                    msg.sender
                ),
                "msg sender does not have updateIssuer in policy Registry"
            );
            return;
        }
        require(
            ds.trustedPolicyRegistry.checkPolicy(
                "TIR:updateIssuer",
                msg.sender
            ) ||
                (checkController(bytes(taoDid), msg.sender) &&
                    compareStrings(taoDid, taoAttrMetadata.did) &&
                    (taoAttrMetadata.issuerType == IssuerType.RootTAO ||
                        taoAttrMetadata.issuerType == IssuerType.TAO)),
            string(
                abi.encodePacked(
                    "Policy error: sender is not TAO/RootTao of current did ",
                    did,
                    " and it doesn't have the attribute TIR:updateIssuer"
                )
            )
        );
    }

    function checkEligibilityUpdateAttribute(
        string calldata did,
        string calldata taoDid,
        bytes32 latestIssuerAttrHash,
        IssuerType issuerType
    ) internal {
        Issuers storage ds = issuerStorage();
        Entity storage iss = ds.issuerStore[did];
        if (issuerType == IssuerType.RootTAO) {
            require(
                ds.trustedPolicyRegistry.checkPolicy(
                    "TIR:updateIssuer",
                    msg.sender
                ),
                "Only TIR:updateIssuer attr in tpr can add RootTAO Attribute"
            );
            return;
        }

        require(
            ds.trustedPolicyRegistry.checkPolicy(
                "TIR:updateIssuer",
                msg.sender
            ) ||
                (
                    (checkController(bytes(taoDid), msg.sender) &&
                        (compareStrings(
                            ds
                                .attributeMetadataStore[latestIssuerAttrHash]
                                .taoDid,
                            taoDid
                        ) ||
                            compareStrings(
                                ds
                                    .attributeMetadataStore[
                                        latestIssuerAttrHash
                                    ]
                                    .rootTaoDid,
                                taoDid
                            )))
                ),
            string(
                abi.encodePacked(
                    "Policy error: sender is not TAO/RootTao of current did ",
                    did,
                    " and it doesn't have the attribute TIR:updateIssuer"
                )
            )
        );
    }

    function computeFirstAttrHash(
        bytes32 lastVersHash,
        bytes32 newAttrHash,
        string calldata did
    ) internal returns (bytes32) {
        Issuers storage ds = issuerStorage();
        Entity storage iss = ds.issuerStore[did];
        bytes32 firstAttrHash = ds
            .attributeMetadataStore[lastVersHash]
            .attributeId;
        require(iss.attributesStore[firstAttrHash].revisionHashes.length > 0);

        require(
            keccak256(bytes(ds.attributeMetadataStore[newAttrHash].did)) ==
                keccak256(bytes("")),
            "attribute is already stored"
        );
        return firstAttrHash;
    }

    function getRootTaoDid(
        bytes32 taoAttrHash
    ) internal returns (string memory) {
        Issuers storage ds = issuerStorage();
        string memory _rootTaoDid;
        _rootTaoDid = ds.attributeMetadataStore[taoAttrHash].rootTaoDid;
        require(
            compareStrings(_rootTaoDid, "") == false,
            "Root Tao not defined"
        );
        return _rootTaoDid;
    }

    function addRevision(
        string calldata did,
        bytes32 firstAttrHash,
        bytes32 newAttrHash,
        bytes calldata attributeData
    ) internal {
        Issuers storage ds = issuerStorage();
        Entity storage iss = ds.issuerStore[did];
        AttributeDetails storage atr = iss.attributesStore[firstAttrHash];
        // push the new version hash for this attribute
        atr.revisionHashes.push(newAttrHash);
        // push the new version data for this attribute
        iss.revisions[newAttrHash] = attributeData;
    }

    function insertMetadata(
        string calldata did,
        bytes32 firstAttrHash,
        IssuerType issuerType,
        string calldata taoDid,
        string memory _rootTaoDid,
        bytes32 newAttrHash
    ) internal {
        Issuers storage ds = issuerStorage();
        Entity storage iss = ds.issuerStore[did];

        ds.attributeMetadataStore[newAttrHash] = AttributeMetadata(
            did,
            firstAttrHash,
            issuerType,
            taoDid,
            _rootTaoDid
        );
    }

    function checkNewAttributeHash(
        string calldata did,
        bytes32 newAttrHash
    ) internal {
        Issuers storage ds = issuerStorage();
        Entity storage iss = ds.issuerStore[did];
        require(
            keccak256(bytes(ds.attributeMetadataStore[newAttrHash].did)) ==
                keccak256(bytes("")),
            "attribute is already stored"
        );

        require(iss.attributes.length > 0, "issuer does not exist");

        require(iss.attributesStore[newAttrHash].revisionHashes.length == 0);
    }

    function saveMetadata(
        string calldata did,
        bytes calldata attributeData,
        IssuerType issuerType,
        string calldata taoDid,
        string memory _rootTaoDid
    ) internal {
        Issuers storage ds = issuerStorage();
        Entity storage iss = ds.issuerStore[did];
        bytes32 newAttrHash = sha256(attributeData);

        ds.attributeMetadataStore[newAttrHash] = AttributeMetadata(
            did,
            newAttrHash,
            issuerType,
            taoDid,
            _rootTaoDid
        );
        // store the version hash and data for this attribute
        AttributeDetails storage atr = iss.attributesStore[newAttrHash];

        // push the new version hash for this attribute
        atr.revisionHashes.push(newAttrHash);
        // push the new version data for this attribute
        iss.revisions[newAttrHash] = attributeData;

        /*
         Push the firstAttrHash of the attribute to uniquely identify an issuer attribute
         Methods .push() and .push(value) can be used to append a new element at the end of the array,
         where .push() appends a zero-initialized element and returns a reference to it.
        */
        iss.attributes.push(newAttrHash);
    }

    function getLatestRevisionAttributeId(
        string calldata did,
        bytes32 attributeId
    ) internal returns (bytes32 latestRevisionAttributeId) {
        Issuers storage ds = issuerStorage();
        Entity storage iss = ds.issuerStore[did];
        require(iss.attributes.length > 0, "issuer does not exist");
        require(
            keccak256(bytes(ds.attributeMetadataStore[attributeId].did)) ==
                keccak256(bytes(did)),
            "attributeId is not link to DID"
        );
        bytes32 firstAttrHash = ds
            .attributeMetadataStore[attributeId]
            .attributeId;
        bytes32[] memory revisionHashes = iss
            .attributesStore[firstAttrHash]
            .revisionHashes;
        require(
            revisionHashes.length > 0,
            "invalid attribute: no revisions found"
        );
        bytes memory latestRevision = iss.revisions[attributeId];
        require(latestRevision.length > 0, "No Revision on this id");
        latestRevisionAttributeId = revisionHashes[revisionHashes.length - 1];
    }

    function getTaoAndRootTao(
        string calldata did,
        IssuerType issuerType,
        string calldata taoDid,
        bytes32 attributeIdTao
    ) internal returns (string memory _taoDid, string memory _rootTaoDid) {
        Issuers storage ds = issuerStorage();
        Entity storage taoIss = ds.issuerStore[taoDid];
        assert(issuerType != IssuerType.Undefined);
        if (issuerType == IssuerType.RootTAO) {
            require(
                ds.trustedPolicyRegistry.checkPolicy(
                    "TIR:insertIssuer",
                    msg.sender
                ),
                "Policy error: sender doesn't have the attribute TIR:insertIssuer"
            );
            // if its RootTao:
            _taoDid = did;
            _rootTaoDid = did;
        } else {
            require(taoIss.attributes.length != 0, "tao does not exists");
            // check msg.sender is the TAO DID
            require(
                checkController(bytes(taoDid), msg.sender),
                "MsgSender is not a controller of Tao Used"
            );

            // check tao Attr Hash is RootTAO or TAO
            bytes32 latestRevisionTaoId = getLatestRevisionAttributeId(
                taoDid,
                attributeIdTao
            );

            require(
                ds.attributeMetadataStore[latestRevisionTaoId].issuerType ==
                    IssuerType.RootTAO ||
                    ds.attributeMetadataStore[latestRevisionTaoId].issuerType ==
                    IssuerType.TAO,
                "Attribute is not RootTAO or TAO"
            );
            _taoDid = taoDid;
            // for root tao we need to set what is the root tao of the current taoDid
            _rootTaoDid = ds
                .attributeMetadataStore[latestRevisionTaoId]
                .rootTaoDid;
        }
    }

    function checkInsertIssuerCondition(
        string calldata did,
        bytes32 firstAttrHash
    ) internal {
        Issuers storage ds = issuerStorage();
        Entity storage iss = ds.issuerStore[did];
        require(iss.attributes.length == 0, "issuer already exist");
        require(
            compareStrings(ds.attributeMetadataStore[firstAttrHash].did, ""),
            "attribute is already stored"
        );

        require(iss.attributesStore[firstAttrHash].revisionHashes.length == 0);
    }

    function insertIssuerAddAttributeMetadata(
        string calldata did,
        bytes32 firstAttrHash,
        IssuerType issuerType,
        string memory _taoDid,
        string memory _rootTaoDid
    ) internal {
        Issuers storage ds = issuerStorage();
        ds.attributeMetadataStore[firstAttrHash] = AttributeMetadata(
            did,
            firstAttrHash,
            issuerType,
            _taoDid,
            _rootTaoDid
        );
    }

    function insertRevisionAndAttributes(
        string calldata did,
        bytes32 firstAttrHash,
        bytes calldata attributeData
    ) internal {
        Issuers storage ds = issuerStorage();
        Entity storage iss = ds.issuerStore[did];
        // store the version hash and data for this attribute
        AttributeDetails storage atr = iss.attributesStore[firstAttrHash];

        // push the new version hash for this attribute
        atr.revisionHashes.push(firstAttrHash);
        // push the new version data for this attribute
        iss.revisions[firstAttrHash] = attributeData;

        /*
         Push the firstAttrHash of the attribute to uniquely identify an issuer attribute
         Methods .push() and .push(value) can be used to append a new element at the end of the array,
         where .push() appends a zero-initialized element and returns a reference to it.
        */
        iss.attributes.push(firstAttrHash);
        uint256 attributesCount = iss.attributes.length;
        ds.didStore.push(did);
        emit AddIssuerAttribute(
            sha256(bytes(did)),
            firstAttrHash,
            did,
            1,
            attributesCount
        );
    }

    function checkController(
        bytes calldata identifier,
        address ctrl
    ) internal returns (bool success) {
        Issuers storage ds = issuerStorage();
        string memory baseDocument;
        if (address(ds.didRegistryV4) != address(0)) {
            (baseDocument, , , , ) = ds.didRegistryV4.getDidDocument(
                string(identifier)
            );
        }
        if (compareStrings(baseDocument, "") == false) {
            success = ds.didRegistryV4.checkController(identifier, ctrl);
        } else {
            success = ds.didRegistry.checkController(identifier, ctrl);
        }
    }

    uint256[50] private ______gap;
}
