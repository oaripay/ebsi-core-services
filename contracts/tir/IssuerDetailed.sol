// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../utils/upgradeability/Initializable.sol";
import "./IssuerStorage.sol";
import "../utils/math/SafeMath.sol";

abstract contract IssuerDetailed is IssuerStorage {
    using SafeMath for uint256;

    event addIssuerAttribute(
        bytes32 indexed didHash,
        bytes32 indexed firstAttrHash,
        string did,
        uint256 attributeVersionCount,
        uint256 attributesCount
    );
    event updateIssuerAttribute(
        bytes32 indexed didHash,
        bytes32 indexed newAttrHash,
        bytes32 indexed previousAttrHash,
        bytes32 firstAttrHash,
        string did,
        uint256 attributeVersionCount,
        uint256 attributesCount
    );

    /**
     * @dev insert an Issuer
     */
    function insertIssuer(string calldata did, bytes calldata attributeData)
        external
    {
        bytes32 firstAttrHash = keccak256(attributeData);
        Issuers storage ds = issuerStorage();
        Entity storage iss = ds.issuerStore[did];
        require(
            iss.attributes.length == 0,
            "issuer already exist use updateIssuer to add or update an attribute"
        );
        require(
            keccak256(bytes(ds.attributeMetadataStore[firstAttrHash].did)) ==
                keccak256(bytes("")),
            "attribute is already stored"
        );

        assert(iss.attributesStore[firstAttrHash].revisionHashes.length == 0);

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
        emit addIssuerAttribute(
            keccak256(bytes(did)),
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
        bytes32 newAttrHash = keccak256(attributeData);
        require(
            keccak256(bytes(ds.attributeMetadataStore[newAttrHash].did)) ==
                keccak256(bytes("")),
            "attribute is already stored"
        );

        Entity storage iss = ds.issuerStore[did];
        require(
            iss.attributes.length > 0,
            "issuer does not exist use insertIssuer to add an issuer"
        );

        assert(iss.attributesStore[newAttrHash].revisionHashes.length == 0);

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
            keccak256(bytes(ds.attributeMetadataStore[lastVersHash].did)) ==
                keccak256(bytes(did)),
            "lastVersHash does not refer to the specified DID"
        );

        Entity storage iss = ds.issuerStore[did];
        require(
            iss.attributes.length > 0,
            "issuer does not exist use insertIssuer to add an issuer"
        );
        // based on the last version hash we can retrive the first version hash for this attribute along with the did
        bytes32 firstAttrHash = ds.attributeMetadataStore[lastVersHash]
            .attributeId;
        assert(iss.attributesStore[firstAttrHash].revisionHashes.length > 0);
        bytes32 newAttrHash = keccak256(attributeData);
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
        emit updateIssuerAttribute(
            keccak256(bytes(did)),
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
            bytes32[] memory versions = ds.issuerStore[did]
                .attributesStore[attributesFirstHash[index]]
                .revisionHashes;

            //get the last version hash for this attribute
            attributesLastHash[index] = versions[versions.length - 1];
        }
        return attributesLastHash;
    }

    function getIssuers(uint256 page, uint256 howMany)
        public
        view
        returns (
            string[] memory items,
            uint256 total,
            uint256 pageSize,
            uint256 prev,
            uint256 next
        )
    {
        require(howMany <= 50, "PageSize should not be greater than 50");
        require(howMany > 0, "PageSize should be greater than 0");
        Issuers storage ds = issuerStorage();
        total = ds.didStore.length;
        pageSize = howMany;
        uint256 length = howMany;
        uint256 cursor = page;
        if (cursor == 0) {
            if (total >= howMany) {
                length = howMany;
                prev = 0;
                next = 1;
            } else {
                length = total;
                pageSize = total;
                prev = 0;
                next = 0;
            }
        } else {
            if (total > page.add(1).mul(howMany)) {
                length = howMany;
                cursor = page.mul(howMany);
                prev = page.sub(1);
                next = page.add(1);
            } else {
                if (howMany >= total) {
                    length = total;
                    pageSize = total;
                    page = 0;
                    cursor = 0;
                    prev = 0;
                    next = 0;
                } else {
                    length = total.mod(howMany);
                    page = total.div(howMany);
                    cursor = page.mul(howMany);
                    prev = page.sub(1);
                    next = page;
                }
            }
        }

        items = new string[](length);
        for (uint256 i = 0; i < length; i++) {
            items[i] = ds.didStore[cursor.add(i)];
        }

        return (items, total, pageSize, prev, next);
    }

    function getIssuerAttributeRevisions(bytes32 anyAttrVersHash)
        public
        view
        returns (bytes32[] memory)
    {
        Issuers storage ds = issuerStorage();
        // retrieve first the did and attrId (firstHash of attribute)
        AttributeMetadata memory i = ds.attributeMetadataStore[anyAttrVersHash];

        require(
            keccak256(bytes(i.did)) != keccak256(bytes("")),
            "attribute has not been found"
        );

        // retrieve the issuer and the attribute detail
        Entity storage iss = ds.issuerStore[i.did];
        return iss.attributesStore[i.attributeId].revisionHashes;
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

    uint256[50] private ______gap;
}
