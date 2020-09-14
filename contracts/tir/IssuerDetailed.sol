pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../utils/upgradeability/Initializable.sol";
import "./IssuerStorage.sol";

contract IssuerDetailed is Initializable, IssuerStorage {
    /**
     * @dev Sets the values for `name`, `symbol`, and `decimals`. All three of
     * these values are immutable: they can only be set once during
     * construction.
     */
    function initialize(uint256 version, address operator)
        public
        virtual
        initializer
    {
        _onInitialize(version, operator);
    }

    function _onInitialize(uint256 version, address operator)
        internal
        initializer
    {
        IssuerModel storage ds = IssuerStorage.issuerStorage();
        ds._version = version;
        ds._operator = operator;
    }

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
     * @dev Returns the operator of the Issuer SC
     */
    function operator() public view returns (address) {
        IssuerModel storage ds = issuerStorage();
        return ds._operator;
    }

    /**
     * @dev Returns the version of the Issuer SC
     */
    function version() public view returns (uint256) {
        IssuerModel storage ds = issuerStorage();
        return ds._version;
    }

    /**
     * @dev insert an Issuer
     */
    function insertIssuer(string calldata did, bytes calldata attributeData)
        external
    {
        bytes32 firstAttrHash = keccak256(attributeData);
        IssuerModel storage ds = issuerStorage();
        Issuer storage iss = ds.issuers[did];
        require(
            iss.attributes.length == 0,
            "issuer already exist use updateIssuer to add or update an attribute"
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
         Push the firstAttrHash of the attribute to uniquely identify an issuer attribute
         Methods .push() and .push(value) can be used to append a new element at the end of the array,
         where .push() appends a zero-initialized element and returns a reference to it.
        */
        iss.attributes.push(firstAttrHash);
        uint256 attributescount = iss.attributes.length;

        emit addIssuerAttribute(
            keccak256(bytes(did)),
            firstAttrHash,
            did,
            1,
            attributescount
        );
    }

    /**
     * @dev add a new issuer's attribute
     */
    function updateIssuer(string calldata did, bytes calldata attributeData)
        external
    {
        IssuerModel storage ds = issuerStorage();
        bytes32 newAttrHash = keccak256(attributeData);
        require(
            keccak256(bytes(ds.attributeInfos[newAttrHash].did)) ==
                keccak256(bytes("")),
            "attribute is already stored"
        );

        Issuer storage iss = ds.issuers[did];
        require(
            iss.attributes.length > 0,
            "issuer does not exist use insertIssuer to add an issuer"
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
        IssuerModel storage ds = issuerStorage();
        require(
            keccak256(bytes(ds.attributeInfos[lastVersHash].did)) ==
                keccak256(bytes(did)),
            "lastVersHash does not refer to the specified DID"
        );

        Issuer storage iss = ds.issuers[did];
        require(
            iss.attributes.length >= 0,
            "issuer does not exist use insertIssuer to add an issuer"
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
        emitUpdateIssuer(did, newAttrHash, lastVersHash, firstAttrHash);
    }

    function emitUpdateIssuer(
        string memory did,
        bytes32 newAttrHash,
        bytes32 lastVersHash,
        bytes32 firstAttrHash
    ) internal {
        IssuerModel storage ds = issuerStorage();
        Issuer storage iss = ds.issuers[did];
        AttributeDetail storage atr = iss.attributesDetail[firstAttrHash];
        uint256 attributeVersionCount = atr.versionHashes.length;
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

    function getIssuerAttributesFirstHash(string memory did)
        public
        view
        returns (bytes32[] memory)
    {
        IssuerModel storage ds = issuerStorage();
        return ds.issuers[did].attributes;
    }

    function getIssuer(string memory did)
        public
        view
        returns (bytes32[] memory)
    {
        IssuerModel storage ds = issuerStorage();
        bytes32[] memory attributesFirstHash = ds.issuers[did].attributes;

        bytes32[] memory attributesLastHash = new bytes32[](
            attributesFirstHash.length
        );
        //list all the attributes
        for (uint256 index = 0; index < attributesFirstHash.length; index++) {
            // get all the versions for the current attribute
            bytes32[] memory versions = ds.issuers[did]
                .attributesDetail[attributesFirstHash[index]]
                .versionHashes;

            //get the last version hash for this attribute
            attributesLastHash[index] = versions[versions.length - 1];
        }
        return attributesLastHash;
    }

    function getAttributeHistory(bytes32 anyAttrVersHash)
        public
        view
        returns (bytes32[] memory)
    {
        IssuerModel storage ds = issuerStorage();
        // retrieve first the did and attrId (firstHash of attribute)
        AttributeInfo memory i = ds.attributeInfos[anyAttrVersHash];
        // retrieve the issuer and the attribute detail
        Issuer storage iss = ds.issuers[i.did];
        return iss.attributesDetail[i.attrId].versionHashes;
    }

    function getAttributebyHash(bytes32 anyAttrVersHash)
        public
        view
        returns (string memory did, bytes memory attribData)
    {
        IssuerModel storage ds = issuerStorage();
        // retrieve first the did and attrId (firstHash of attribute)
        AttributeInfo memory i = ds.attributeInfos[anyAttrVersHash];
        did = i.did;
        // retrieve the issuer and the attribute detail
        Issuer storage iss = ds.issuers[i.did];
        attribData = iss.attributesDetail[i.attrId]
            .versionData[anyAttrVersHash];
    }

    function getDid(bytes32 attributeHash) public view returns (string memory) {
        IssuerModel storage ds = issuerStorage();
        return ds.attributeInfos[attributeHash].did;
    }

    uint256[50] private ______gap;
}
