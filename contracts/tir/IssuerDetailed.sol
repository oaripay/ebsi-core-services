// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

// solhint-disable-next-line max-line-length
import "./IssuerStorage.sol";
import "../bootstrap-ethereum-sc/contracts/utils/Pagination.sol";

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
    event AddIssuerProxy(string did, bytes32 indexed firstProxyHash);
    event UpdateIssuerProxy(string did, bytes32 indexed newProxyHash);

    /**
     * @dev insert an Issuer
     */
    function insertIssuer(string calldata did, bytes calldata attributeData)
        external
    {
        bytes32 firstAttrHash = sha256(attributeData);
        Issuers storage ds = issuerStorage();

        require(
            ds.trustedPolicyRegistry.checkPolicy(
                "TIR:insertIssuer",
                msg.sender
            ),
            "Policy error: sender doesn't have the attribute TIR:insertIssuer"
        );

        Entity storage iss = ds.issuerStore[did];
        require(iss.attributes.length == 0, "issuer already exist");
        require(
            keccak256(bytes(ds.attributeMetadataStore[firstAttrHash].did)) ==
                keccak256(bytes("")),
            "attribute is already stored"
        );

        require(iss.attributesStore[firstAttrHash].revisionHashes.length == 0);

        // store a link between this hash to the did to easily retrieve it
        ds.attributeMetadataStore[firstAttrHash] = AttributeMetadata(
            did,
            firstAttrHash
        );
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

    /**
     * @dev add a new issuer's attribute
     */
    function updateIssuer(string calldata did, bytes calldata attributeData)
        external
    {
        Issuers storage ds = issuerStorage();

        require(
            ds.trustedPolicyRegistry.checkPolicy(
                "TIR:updateIssuer",
                msg.sender
            ) || ds.didRegistry.checkController(bytes(did), msg.sender),
            string(
                abi.encodePacked(
                    "Policy error: sender is not controller of the did ",
                    did,
                    " and it doesn't have the attribute TIR:updateIssuer"
                )
            )
        );

        bytes32 newAttrHash = sha256(attributeData);
        require(
            keccak256(bytes(ds.attributeMetadataStore[newAttrHash].did)) ==
                keccak256(bytes("")),
            "attribute is already stored"
        );

        Entity storage iss = ds.issuerStore[did];
        require(iss.attributes.length > 0, "issuer does not exist");

        require(iss.attributesStore[newAttrHash].revisionHashes.length == 0);

        // store a link between this hash to the did to easily retrieve it
        ds.attributeMetadataStore[newAttrHash] = AttributeMetadata(
            did,
            newAttrHash
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

        emitUpdateIssuer(did, newAttrHash, newAttrHash, newAttrHash);
    }

    /**
     * @dev add a new version to a issuer's attribute
     */
    function updateIssuer(
        string calldata did,
        bytes calldata attributeData,
        bytes32 lastVersHash
    ) external {
        Issuers storage ds = issuerStorage();

        require(
            ds.trustedPolicyRegistry.checkPolicy(
                "TIR:updateIssuer",
                msg.sender
            ) || ds.didRegistry.checkController(bytes(did), msg.sender),
            string(
                abi.encodePacked(
                    "Policy error: sender is not controller of the did ",
                    did,
                    " and it doesn't have the attribute TIR:updateIssuer"
                )
            )
        );

        Entity storage iss = ds.issuerStore[did];
        require(iss.attributes.length > 0, "issuer does not exist");

        require(
            keccak256(bytes(ds.attributeMetadataStore[lastVersHash].did)) ==
                keccak256(bytes(did)),
            "lastVersHash is not link to DID"
        );

        // based on the last version hash we can retrive the first version hash for this attribute along with the did
        bytes32 firstAttrHash = ds
            .attributeMetadataStore[lastVersHash]
            .attributeId;
        require(iss.attributesStore[firstAttrHash].revisionHashes.length > 0);
        bytes32 newAttrHash = sha256(attributeData);
        require(
            keccak256(bytes(ds.attributeMetadataStore[newAttrHash].did)) ==
                keccak256(bytes("")),
            "attribute is already stored"
        );
        // store a link between this hash, the first hash and the did to easily retrieve it
        ds.attributeMetadataStore[newAttrHash] = AttributeMetadata(
            did,
            firstAttrHash
        );
        // retrieve the detail info for this attribute
        AttributeDetails storage atr = iss.attributesStore[firstAttrHash];
        // push the new version hash for this attribute
        atr.revisionHashes.push(newAttrHash);
        // push the new version data for this attribute
        iss.revisions[newAttrHash] = attributeData;
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

    function getIssuer(string memory did)
        public
        view
        returns (bytes32[] memory)
    {
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

    function getIssuers(uint256 page, uint256 pageSize)
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

    function getIssuerAttributeByHash(bytes32 anyAttrVersHash)
        public
        view
        returns (string memory did, bytes memory attribData)
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
    }

    /**
     * @dev Add a proxy record to an issuer.
     */
    function addIssuerProxy(string calldata did, bytes calldata proxyData)
        external
    {
        bytes32 firstProxyHash = sha256(proxyData);
        Issuers storage ds = issuerStorage();

        Entity storage iss = ds.issuerStore[did];

        iss.proxies.push(firstProxyHash);
        iss.proxiesStore[firstProxyHash] = proxyData;

        emit AddIssuerProxy(did, firstProxyHash);
    }

    /**
     * @dev Update a given issuer proxy.
     */
    function updateIssuerProxy(
        string calldata did,
        bytes32 proxyId,
        bytes calldata proxyData
    ) external {
        Issuers storage ds = issuerStorage();
        Entity storage iss = ds.issuerStore[did];

        bytes32 newProxyId = sha256(proxyData);
        iss.proxiesStore[newProxyId] = proxyData;
        iss.proxies.push(newProxyId);
        delete iss.proxiesStore[proxyId];

        emit UpdateIssuerProxy(did, newProxyId);
    }

    /**
     * @dev Get proxy data by its id/hash.
     */
    function getIssuerProxyById(string memory did, bytes32 proxyIdHash)
        public
        view
        returns (bytes memory proxyData)
    {
        Issuers storage ds = issuerStorage();
        bytes memory _proxyData = ds.issuerStore[did].proxiesStore[proxyIdHash];
        return _proxyData;
    }

    /**
     * @dev Return the list of proxies of a given issuer.
     */
    function getIssuerProxies(string memory did)
        public
        view
        returns (bytes32[] memory)
    {
        Issuers storage ds = issuerStorage();

        bytes32[] memory proxies = ds.issuerStore[did].proxies;

        return proxies;
    }

    uint256[50] private ______gap;
}
