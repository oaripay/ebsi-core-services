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

    function compareStrings(
        string memory str1,
        string memory str2
    ) internal pure returns (bool) {
        return
            keccak256(abi.encodePacked(str1)) ==
            keccak256(abi.encodePacked(str2));
    }

    function addRevision(
        string memory did,
        bytes32 attributeId,
        bytes32 newRevisionId,
        IssuerType issuerType,
        string memory taoDid,
        string memory _rootTaoDid,
        bytes memory attributeData
    ) internal {
        Issuers storage ds = issuerStorage();
        Entity storage iss = ds.issuerStore[did];

        require(
            compareStrings(ds.attributeMetadataStore[newRevisionId].did, ""),
            "revision already stored"
        );

        AttributeDetails storage atr = iss.attributesStore[attributeId];
        // push the new version hash for this attribute
        atr.revisionHashes.push(newRevisionId);
        // push the new version data for this attribute
        iss.revisions[newRevisionId] = attributeData;
        // push the new version metadata for this attribute
        ds.attributeMetadataStore[newRevisionId] = AttributeMetadata(
            did,
            attributeId,
            issuerType,
            taoDid,
            _rootTaoDid
        );
    }

    function checkEligibility(
        string memory did,
        bytes32 lastRevisionId,
        IssuerType issuerType,
        string memory taoDid,
        bytes32 lastRevisionIdTao,
        string memory policy
    ) internal {
        Issuers storage ds = issuerStorage();
        Entity storage iss = ds.issuerStore[did];
        require(iss.attributes.length > 0, "issuer does not exist");
        bool hasTprPolicy = ds.trustedPolicyRegistry.checkPolicy(
            policy,
            msg.sender
        );
        if (issuerType == IssuerType.RootTAO) {
            require(
                hasTprPolicy,
                string(
                    abi.encodePacked(
                        "Policy error: sender doesn't have the attribute ",
                        policy
                    )
                )
            );
            return;
        }
        AttributeMetadata storage lastAttrMetadata = ds.attributeMetadataStore[
            lastRevisionId
        ];

        AttributeMetadata memory lastTaoAttrMetadata = ds
            .attributeMetadataStore[lastRevisionIdTao];
        require(
            hasTprPolicy ||
                (checkController(bytes(taoDid), msg.sender) &&
                    (lastTaoAttrMetadata.issuerType == IssuerType.RootTAO ||
                        lastTaoAttrMetadata.issuerType == IssuerType.TAO)),
            string(
                abi.encodePacked(
                    "Policy error: sender is not TAO/RootTao it doesn't have the attribute ",
                    policy
                )
            )
        );

        // in the case of existing attributes make sure the TAO/RootTAO
        // is part of the trust chain of the attribute
        bool isNewAttribute = compareStrings(lastAttrMetadata.did, "");
        bool isTaoOfAttribute = compareStrings(lastAttrMetadata.taoDid, taoDid);
        bool isRootTaoOfAttribute = compareStrings(
            lastAttrMetadata.rootTaoDid,
            taoDid
        );
        require(
            isNewAttribute || isTaoOfAttribute || isRootTaoOfAttribute,
            string(
                abi.encodePacked(
                    "Policy error: sender is not TAO/RootTao of current did ",
                    did,
                    " and it doesn't have the attribute ",
                    policy
                )
            )
        );
    }

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
        assert(issuerType != IssuerType.Undefined);
        bytes32 attributeId = sha256(attributeData);
        Issuers storage ds = issuerStorage();

        Entity storage iss = ds.issuerStore[did];
        AttributeDetails storage atr = iss.attributesStore[attributeId];
        AttributeMetadata storage attrMetadata = ds.attributeMetadataStore[
            attributeId
        ];

        // insert issuer
        require(iss.attributes.length == 0, "issuer already exist");
        ds.didStore.push(did);

        // insert attribute
        require(
            compareStrings(attrMetadata.did, ""),
            "attribute is already stored"
        );
        iss.attributes.push(attributeId);
        bytes32 lastRevisionId = attributeId;
        bytes32 newRevisionId = attributeId;

        string memory _rootTaoDid;
        bytes32 lastRevisionIdTao = bytes32(0);
        if (issuerType == IssuerType.RootTAO) {
            taoDid = did;
            _rootTaoDid = did;
        } else {
            lastRevisionIdTao = getLatestRevisionAttributeId(
                taoDid,
                attributeIdTao
            );
            _rootTaoDid = ds
                .attributeMetadataStore[lastRevisionIdTao]
                .rootTaoDid;
        }

        checkEligibility(
            did,
            lastRevisionId,
            issuerType,
            taoDid,
            lastRevisionIdTao,
            "TIR:insertIssuer"
        );

        addRevision(
            did,
            attributeId,
            newRevisionId,
            issuerType,
            taoDid,
            _rootTaoDid,
            attributeData
        );

        emit AddIssuerAttribute(sha256(bytes(did)), attributeId, did, 1, 1);
    }

    /**
     * @dev add a new issuer's attribute with TAO
     */
    function updateIssuer(
        string calldata did,
        bytes calldata attributeData,
        IssuerType issuerType,
        string calldata taoDid,
        bytes32 attributeIdTao
    ) external {
        assert(issuerType != IssuerType.Undefined);
        bytes32 attributeId = sha256(attributeData);
        Issuers storage ds = issuerStorage();

        Entity storage iss = ds.issuerStore[did];
        AttributeDetails storage atr = iss.attributesStore[attributeId];
        AttributeMetadata storage attrMetadata = ds.attributeMetadataStore[
            attributeId
        ];

        require(iss.attributes.length > 0, "issuer does not exist");

        // insert attribute
        require(
            compareStrings(attrMetadata.did, ""),
            "attribute is already stored"
        );
        iss.attributes.push(attributeId);
        bytes32 lastRevisionId = attributeId;
        bytes32 newRevisionId = attributeId;

        string memory _rootTaoDid;
        bytes32 lastRevisionIdTao = bytes32(0);
        if (issuerType == IssuerType.RootTAO) {
            taoDid = did;
            _rootTaoDid = did;
        } else {
            lastRevisionIdTao = getLatestRevisionAttributeId(
                taoDid,
                attributeIdTao
            );
            _rootTaoDid = ds
                .attributeMetadataStore[lastRevisionIdTao]
                .rootTaoDid;
        }

        checkEligibility(
            did,
            lastRevisionId,
            issuerType,
            taoDid,
            lastRevisionIdTao,
            "TIR:updateIssuer"
        );

        addRevision(
            did,
            attributeId,
            newRevisionId,
            issuerType,
            taoDid,
            _rootTaoDid,
            attributeData
        );

        uint256 attributesCount = iss.attributes.length;
        uint256 attributeVersionCount = atr.revisionHashes.length;
        emit UpdateIssuerAttribute(
            sha256(bytes(did)),
            newRevisionId,
            lastRevisionId,
            attributeId,
            did,
            attributeVersionCount,
            attributesCount
        );
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
        bytes32 lastRevisionId = getLatestRevisionAttributeId(
            did,
            lastVersHash
        );
        Issuers storage ds = issuerStorage();
        bytes32 attributeId = ds
            .attributeMetadataStore[lastVersHash]
            .attributeId;

        Entity storage iss = ds.issuerStore[did];
        AttributeDetails storage atr = iss.attributesStore[attributeId];
        AttributeMetadata storage attrMetadata = ds.attributeMetadataStore[
            attributeId
        ];

        string memory _rootTaoDid;
        bytes32 lastRevisionIdTao = bytes32(0);
        if (issuerType == IssuerType.RootTAO) {
            taoDid = did;
            _rootTaoDid = did;
        } else {
            lastRevisionIdTao = getLatestRevisionAttributeId(
                taoDid,
                attributeIdTao
            );
            _rootTaoDid = ds
                .attributeMetadataStore[lastRevisionIdTao]
                .rootTaoDid;
        }
        checkEligibility(
            did,
            lastRevisionId,
            issuerType,
            taoDid,
            lastRevisionIdTao,
            "TIR:updateIssuer"
        );

        _addRevisionUpdate(
            did,
            attributeId,
            issuerType,
            taoDid,
            _rootTaoDid,
            attributeData
        );

        emitUpdateIssuerAttribute(
            did,
            attributeData,
            lastRevisionId,
            attributeId
        );
    }

    function _addRevisionUpdate(
        string memory did,
        bytes32 attributeId,
        IssuerType issuerType,
        string memory taoDid,
        string memory _rootTaoDid,
        bytes memory attributeData
    ) internal {
        addRevision(
            did,
            attributeId,
            sha256(attributeData),
            issuerType,
            taoDid,
            _rootTaoDid,
            attributeData
        );
    }

    function emitUpdateIssuerAttribute(
        string memory did,
        bytes memory attributeData,
        bytes32 lastRevisionId,
        bytes32 attributeId
    ) internal {
        Issuers storage ds = issuerStorage();
        Entity storage iss = ds.issuerStore[did];
        AttributeDetails storage atr = iss.attributesStore[attributeId];
        uint256 attributesCount = iss.attributes.length;
        uint256 attributeVersionCount = atr.revisionHashes.length;
        emit UpdateIssuerAttribute(
            sha256(bytes(did)),
            sha256(attributeData),
            lastRevisionId,
            attributeId,
            did,
            attributeVersionCount,
            attributesCount
        );
    }

    function setAttributeMetadata(
        string calldata did,
        bytes32 attributeId,
        IssuerType issuerType,
        string calldata taoDid,
        bytes32 attributeIdTao
    ) external {
        assert(issuerType != IssuerType.Undefined);
        Issuers storage ds = issuerStorage();

        Entity storage iss = ds.issuerStore[did];
        AttributeDetails storage atr = iss.attributesStore[attributeId];
        AttributeMetadata storage attrMetadata = ds.attributeMetadataStore[
            attributeId
        ];

        // insert the issuer if it doesn't exist
        if (iss.attributes.length == 0) {
            ds.didStore.push(did);
        }

        bytes32 lastRevisionId;
        bytes32 newRevisionId;
        if (compareStrings(attrMetadata.did, "")) {
            // new attribute
            iss.attributes.push(attributeId);
            lastRevisionId = attributeId;
            newRevisionId = attributeId;
        } else {
            // existing attribute
            lastRevisionId = getLatestRevisionAttributeId(did, attributeId);
            bytes memory seedAttributeData = abi.encode(
                "Some Random attr data",
                did,
                block.timestamp,
                atr.revisionHashes.length
            );
            newRevisionId = sha256(seedAttributeData);
        }

        string memory _rootTaoDid;
        bytes32 lastRevisionIdTao = bytes32(0);
        if (issuerType == IssuerType.RootTAO) {
            taoDid = did;
            _rootTaoDid = did;
        } else {
            lastRevisionIdTao = getLatestRevisionAttributeId(
                taoDid,
                attributeIdTao
            );
            _rootTaoDid = ds
                .attributeMetadataStore[lastRevisionIdTao]
                .rootTaoDid;
        }

        checkEligibility(
            did,
            lastRevisionId,
            issuerType,
            taoDid,
            lastRevisionIdTao,
            "TIR:setAttributeMetadata"
        );

        addRevision(
            did,
            attributeId,
            newRevisionId,
            issuerType,
            taoDid,
            _rootTaoDid,
            abi.encode("")
        );
    }

    function setAttributeData(
        string calldata did,
        bytes32 attributeId,
        bytes calldata attributeData
    ) external {
        require(
            checkController(bytes(did), msg.sender),
            "Not the issuer itself"
        );
        Issuers storage ds = issuerStorage();
        Entity storage iss = ds.issuerStore[did];
        AttributeMetadata storage attrMetadata = ds.attributeMetadataStore[
            attributeId
        ];
        require(
            !compareStrings(attrMetadata.did, ""),
            "Attribute does not exists"
        );

        bytes32 newRevisionId = sha256(attributeData);
        string memory taoDid = attrMetadata.taoDid;
        string memory rootTaoDid = attrMetadata.rootTaoDid;

        addRevision(
            did,
            attrMetadata.attributeId,
            newRevisionId,
            attrMetadata.issuerType,
            taoDid,
            rootTaoDid,
            attributeData
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
        latestRevisionAttributeId = revisionHashes[revisionHashes.length - 1];
    }

    function checkController(
        bytes memory identifier,
        address ctrl
    ) internal returns (bool) {
        Issuers storage ds = issuerStorage();
        return ds.didRegistry.checkController(identifier, ctrl);
    }

    uint256[50] private ______gap;
}
