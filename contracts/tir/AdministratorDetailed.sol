// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../utils/upgradeability/Initializable.sol";
import "./AdministratorStorage.sol";
import "../utils/math/SafeMath.sol";

abstract contract AdministratorDetailed is AdministratorStorage {
    using SafeMath for uint256;

    event addAdministratorAttribute(
        bytes32 indexed didHash,
        bytes32 indexed firstAttrHash,
        string did,
        uint256 attributeVersionCount,
        uint256 attributesCount
    );
    event updateAdministratorAttribute(
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
        string calldata did,
        bytes calldata attributeData
    ) external {
        bytes32 firstAttrHash = keccak256(attributeData);
        AdministratorModel storage ds = administratorStorage();
        Administrator storage iss = ds.administrators[did];
        require(
            iss.attributes.length == 0,
            "administrator already exist use updateAdministrator to add or update an attribute"
        );
        require(
            keccak256(bytes(ds.attributeInfos[firstAttrHash].did)) ==
                keccak256(bytes("")),
            "attribute is already stored"
        );

        assert(iss.attributesDetail[firstAttrHash].versionHashes.length == 0);

        // store a link between this hash to the did to easily retrieve it
        ds.attributeInfos[firstAttrHash] = AttributeInfo(did, firstAttrHash);
        // store the version hash and data for this attribute
        AttributeDetail storage atr = iss.attributesDetail[firstAttrHash];

        // push the new version hash for this attribute
        atr.versionHashes.push(firstAttrHash);
        // push the new version data for this attribute
        atr.versionData[firstAttrHash] = attributeData;

        /*
         Push the firstAttrHash of the attribute to uniquely identify an administrator attribute
         Methods .push() and .push(value) can be used to append a new element at the end of the array,
         where .push() appends a zero-initialized element and returns a reference to it.
        */
        iss.attributes.push(firstAttrHash);
        uint256 attributescount = iss.attributes.length;
        ds.dids.push(did);
        emit addAdministratorAttribute(
            keccak256(bytes(did)),
            firstAttrHash,
            did,
            1,
            attributescount
        );
    }

    /**
     * @dev add a new administrator's attribute
     */
    function updateAdministrator(
        string calldata did,
        bytes calldata attributeData
    ) external {
        AdministratorModel storage ds = administratorStorage();
        bytes32 newAttrHash = keccak256(attributeData);
        require(
            keccak256(bytes(ds.attributeInfos[newAttrHash].did)) ==
                keccak256(bytes("")),
            "attribute is already stored"
        );

        Administrator storage iss = ds.administrators[did];
        require(
            iss.attributes.length > 0,
            "administrator does not exist use insertAdministrator to add an administrator"
        );

        assert(iss.attributesDetail[newAttrHash].versionHashes.length == 0);

        // store a link between this hash to the did to easily retrieve it
        ds.attributeInfos[newAttrHash] = AttributeInfo(did, newAttrHash);
        // store the version hash and data for this attribute
        AttributeDetail storage atr = iss.attributesDetail[newAttrHash];

        // push the new version hash for this attribute
        atr.versionHashes.push(newAttrHash);
        // push the new version data for this attribute
        atr.versionData[newAttrHash] = attributeData;

        /*
         Push the firstAttrHash of the attribute to uniquely identify an administrator attribute
         Methods .push() and .push(value) can be used to append a new element at the end of the array,
         where .push() appends a zero-initialized element and returns a reference to it.
        */
        iss.attributes.push(newAttrHash);

        emitUpdateAdministrator(did, newAttrHash, newAttrHash, newAttrHash);
    }

    /**
     * @dev add a new version to a administrator's attribute
     */
    function updateAdministrator(
        string calldata did,
        bytes calldata attributeData,
        bytes32 lastVersHash
    ) external {
        AdministratorModel storage ds = administratorStorage();
        require(
            keccak256(bytes(ds.attributeInfos[lastVersHash].did)) ==
                keccak256(bytes(did)),
            "lastVersHash does not refer to the specified DID"
        );

        Administrator storage iss = ds.administrators[did];
        require(
            iss.attributes.length >= 0,
            "administrator does not exist use insertAdministrator to add an administrator"
        );
        // based on the last version hash we can retrive the first version hash for this attribute along with the did
        bytes32 firstAttrHash = ds.attributeInfos[lastVersHash].attrId;
        assert(iss.attributesDetail[firstAttrHash].versionHashes.length > 0);
        bytes32 newAttrHash = keccak256(attributeData);
        require(
            keccak256(bytes(ds.attributeInfos[newAttrHash].did)) ==
                keccak256(bytes("")),
            "attribute is already stored"
        );
        // store a link between this hash, the first hash and the did to easily retrieve it
        ds.attributeInfos[newAttrHash] = AttributeInfo(did, firstAttrHash);
        // retrieve the detail info for this attribute
        AttributeDetail storage atr = iss.attributesDetail[firstAttrHash];
        // push the new version hash for this attribute
        atr.versionHashes.push(newAttrHash);
        // push the new version data for this attribute
        atr.versionData[newAttrHash] = attributeData;
        emitUpdateAdministrator(did, newAttrHash, lastVersHash, firstAttrHash);
    }

    function emitUpdateAdministrator(
        string memory did,
        bytes32 newAttrHash,
        bytes32 lastVersHash,
        bytes32 firstAttrHash
    ) internal {
        AdministratorModel storage ds = administratorStorage();
        Administrator storage iss = ds.administrators[did];
        AttributeDetail storage atr = iss.attributesDetail[firstAttrHash];
        uint256 attributeVersionCount = atr.versionHashes.length;
        uint256 attributesCount = iss.attributes.length;
        emit updateAdministratorAttribute(
            keccak256(bytes(did)),
            newAttrHash,
            lastVersHash,
            firstAttrHash,
            did,
            attributeVersionCount,
            attributesCount
        );
    }

    function getAdministratorAttributesFirstHash(string memory did)
        public
        view
        returns (bytes32[] memory)
    {
        AdministratorModel storage ds = administratorStorage();
        return ds.administrators[did].attributes;
    }

    function getAdministrator(string memory did)
        public
        view
        returns (bytes32[] memory)
    {
        AdministratorModel storage ds = administratorStorage();
        bytes32[] memory attributesFirstHash = ds.administrators[did]
            .attributes;

        bytes32[] memory attributesLastHash = new bytes32[](
            attributesFirstHash.length
        );
        //list all the attributes
        for (uint256 index = 0; index < attributesFirstHash.length; index++) {
            // get all the versions for the current attribute
            bytes32[] memory versions = ds.administrators[did]
                .attributesDetail[attributesFirstHash[index]]
                .versionHashes;

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
    function getAdministrators(uint256 page, uint256 howMany)
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
        AdministratorModel storage ds = administratorStorage();
        total = ds.dids.length;
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
            items[i] = ds.dids[cursor.add(i)];
        }

        return (items, total, pageSize, prev, next);
    }

    function getAdministratorAttributeHistory(bytes32 anyAttrVersHash)
        public
        view
        returns (bytes32[] memory)
    {
        AdministratorModel storage ds = administratorStorage();
        // retrieve first the did and attrId (firstHash of attribute)
        AttributeInfo memory i = ds.attributeInfos[anyAttrVersHash];
        // retrieve the administrator and the attribute detail
        Administrator storage iss = ds.administrators[i.did];
        return iss.attributesDetail[i.attrId].versionHashes;
    }

    function getAdministratorAttributebyHash(bytes32 anyAttrVersHash)
        public
        view
        returns (string memory did, bytes memory attribData)
    {
        AdministratorModel storage ds = administratorStorage();
        // retrieve first the did and attrId (firstHash of attribute)
        AttributeInfo memory i = ds.attributeInfos[anyAttrVersHash];
        did = i.did;
        // retrieve the administrator and the attribute detail
        Administrator storage iss = ds.administrators[i.did];
        attribData = iss.attributesDetail[i.attrId]
            .versionData[anyAttrVersHash];
    }

    function getAdministratorDid(bytes32 attributeHash)
        public
        view
        returns (string memory)
    {
        AdministratorModel storage ds = administratorStorage();
        return ds.attributeInfos[attributeHash].did;
    }

    uint256[50] private ______gap;
}
