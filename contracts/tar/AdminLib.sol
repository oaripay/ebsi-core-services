// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.5;
pragma experimental ABIEncoderV2;

import "./AdminStoreLib.sol";
import "./AttributeStoreLib.sol";
import "../utils/Pagination.sol";

library AdminLib {
    using Pagination for bytes32[];
    using Pagination for string[];

    event AddAdministratorAttribute(
        bytes32 indexed didHash,
        bytes32 indexed firstAttrHash,
        string did,
        uint256 attributeVersionCount,
        uint256 attributesCount
    );
    event UpdateAdministratorAttribute(
        bytes32 indexed didHash,
        bytes32 indexed newAttrHash,
        bytes32 indexed previousAttrHash,
        bytes32 firstAttrHash,
        string did,
        uint256 attributeVersionCount,
        uint256 attributesCount
    );

    /**
     * @dev insert an Administrator
     */
    function insertAdministrator(
        AdminStoreLib.Administrators storage ds,
        string calldata did,
        bytes calldata attributeData
    ) external {
        bytes32 firstAttrHash = sha256(attributeData);

        AttributeStoreLib.Entity storage iss = ds.administratorStore[did];
        require(iss.attributes.length == 0, "admin exist");
        require(
            keccak256(bytes(ds.attributeMetadataStore[firstAttrHash].did)) ==
                keccak256(bytes("")),
            "attr exist"
        );

        assert(iss.attributesStore[firstAttrHash].revisionHashes.length == 0);

        // store a link between this hash to the did to easily retrieve it
        ds.attributeMetadataStore[firstAttrHash] = AttributeStoreLib
            .AttributeMetadata(did, firstAttrHash);
        // store the version hash and data for this attribute
        AttributeStoreLib.AttributeDetails storage atr =
            iss.attributesStore[firstAttrHash];

        // push the new version hash for this attribute
        atr.revisionHashes.push(firstAttrHash);
        // push the new version data for this attribute
        iss.revisions[firstAttrHash] = attributeData;

        /*
         Push the firstAttrHash of the attribute to uniquely identify an administrator attribute
         Methods .push() and .push(value) can be used to append a new element at the end of the array,
         where .push() appends a zero-initialized element and returns a reference to it.
        */
        iss.attributes.push(firstAttrHash);
        uint256 attributesCount = iss.attributes.length;
        ds.didStore.push(did);
        emit AddAdministratorAttribute(
            sha256(bytes(did)),
            firstAttrHash,
            did,
            1,
            attributesCount
        );
    }

    /**
     * @dev add a new administrator's attribute
     */
    function updateAdministrator(
        AdminStoreLib.Administrators storage ds,
        string calldata did,
        bytes calldata attributeData
    ) external {
        bytes32 newAttrHash = sha256(attributeData);
        require(
            keccak256(bytes(ds.attributeMetadataStore[newAttrHash].did)) ==
                keccak256(bytes("")),
            "attribute is already stored"
        );

        AttributeStoreLib.Entity storage iss = ds.administratorStore[did];
        require(iss.attributes.length > 0, "admin unknown");

        assert(iss.attributesStore[newAttrHash].revisionHashes.length == 0);

        // store a link between this hash to the did to easily retrieve it
        ds.attributeMetadataStore[newAttrHash] = AttributeStoreLib
            .AttributeMetadata(did, newAttrHash);
        // store the version hash and data for this attribute
        AttributeStoreLib.AttributeDetails storage atr =
            iss.attributesStore[newAttrHash];

        // push the new version hash for this attribute
        atr.revisionHashes.push(newAttrHash);
        // push the new version data for this attribute
        iss.revisions[newAttrHash] = attributeData;

        /*
         Push the firstAttrHash of the attribute to uniquely identify an administrator attribute
         Methods .push() and .push(value) can be used to append a new element at the end of the array,
         where .push() appends a zero-initialized element and returns a reference to it.
        */
        iss.attributes.push(newAttrHash);

        emitUpdateAdministrator(ds, did, newAttrHash, newAttrHash, newAttrHash);
    }

    /**
     * @dev add a new version to a administrator's attribute
     */
    function updateAdministrator(
        AdminStoreLib.Administrators storage ds,
        string calldata did,
        bytes calldata attributeData,
        bytes32 lastVersHash
    ) external {
        require(
            keccak256(bytes(ds.attributeMetadataStore[lastVersHash].did)) ==
                keccak256(bytes(did)),
            "lastVers != DID"
        );

        AttributeStoreLib.Entity storage iss = ds.administratorStore[did];
        require(iss.attributes.length >= 0, "admin unknown");
        // based on the last version hash we can retrive the first version hash for this attribute along with the did
        bytes32 firstAttrHash =
            ds.attributeMetadataStore[lastVersHash].attributeId;
        assert(iss.attributesStore[firstAttrHash].revisionHashes.length > 0);
        bytes32 newAttrHash = sha256(attributeData);
        require(
            keccak256(bytes(ds.attributeMetadataStore[newAttrHash].did)) ==
                keccak256(bytes("")),
            "attr exist"
        );
        // store a link between this hash, the first hash and the did to easily retrieve it
        ds.attributeMetadataStore[newAttrHash] = AttributeStoreLib
            .AttributeMetadata(did, firstAttrHash);
        // retrieve the detail info for this attribute
        AttributeStoreLib.AttributeDetails storage atr =
            iss.attributesStore[firstAttrHash];
        // push the new version hash for this attribute
        atr.revisionHashes.push(newAttrHash);
        // push the new version data for this attribute
        iss.revisions[newAttrHash] = attributeData;
        emitUpdateAdministrator(
            ds,
            did,
            newAttrHash,
            lastVersHash,
            firstAttrHash
        );
    }

    function emitUpdateAdministrator(
        AdminStoreLib.Administrators storage ds,
        string memory did,
        bytes32 newAttrHash,
        bytes32 lastVersHash,
        bytes32 firstAttrHash
    ) internal {
        AttributeStoreLib.Entity storage iss = ds.administratorStore[did];
        AttributeStoreLib.AttributeDetails storage atr =
            iss.attributesStore[firstAttrHash];
        uint256 attributeVersionCount = atr.revisionHashes.length;
        uint256 attributesCount = iss.attributes.length;
        emit UpdateAdministratorAttribute(
            sha256(bytes(did)),
            newAttrHash,
            lastVersHash,
            firstAttrHash,
            did,
            attributeVersionCount,
            attributesCount
        );
    }

    function getAdministrator(
        AdminStoreLib.Administrators storage ds,
        string memory did
    ) public view returns (bytes32[] memory) {
        bytes32[] memory attributesFirstHash =
            ds.administratorStore[did].attributes;
        require(attributesFirstHash.length > 0, "admin unknown");
        bytes32[] memory attributesLastHash =
            new bytes32[](attributesFirstHash.length);
        //list all the attributes
        for (uint256 index = 0; index < attributesFirstHash.length; index++) {
            // get all the versions for the current attribute
            bytes32[] memory versions =
                ds.administratorStore[did].attributesStore[
                    attributesFirstHash[index]
                ]
                    .revisionHashes;

            //get the last version hash for this attribute
            attributesLastHash[index] = versions[versions.length - 1];
        }
        return attributesLastHash;
    }

    /* {
      "items": [administratorA, administratorB],
      "total": 30,
      "pageSize": 2,
      "prev": 3,
      "next": 5
    } */
    function getAdministrators(
        AdminStoreLib.Administrators storage ds,
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
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");
        return ds.didStore.paginate(page, pageSize);
    }

    function getAdministratorAttributeRevisions(
        AdminStoreLib.Administrators storage ds,
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
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");
        // retrieve first the did and attrId (firstHash of attribute)
        AttributeStoreLib.AttributeMetadata memory am =
            ds.attributeMetadataStore[anyAttrVersHash];
        require(
            keccak256(bytes(am.did)) != keccak256(bytes("")),
            "attr unknown"
        );

        // retrieve the issuer and the attribute detail
        return
            ds.administratorStore[am.did].attributesStore[am.attributeId]
                .revisionHashes
                .paginate(page, pageSize);
    }

    function getAdministratorAttributeByHash(
        AdminStoreLib.Administrators storage ds,
        bytes32 anyAttrVersHash
    ) public view returns (string memory did, bytes memory attribData) {
        // retrieve first the did and attrId (firstHash of attribute)
        AttributeStoreLib.AttributeMetadata memory i =
            ds.attributeMetadataStore[anyAttrVersHash];
        require(
            keccak256(bytes(i.did)) != keccak256(bytes("")),
            "attr unknown"
        );
        did = i.did;
        // retrieve the administrator and the attribute detail
        AttributeStoreLib.Entity storage iss = ds.administratorStore[i.did];
        attribData = iss.revisions[anyAttrVersHash];
    }
}
