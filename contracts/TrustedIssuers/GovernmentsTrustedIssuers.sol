pragma solidity >=0.4.21 <0.6.0;

import '../roles/roles/Ownable.sol';
import '../roles/roles/SignerRole.sol';
import '../EthereumDIDRegistry/EthereumDIDRegistry.sol';

contract GovernmentsTrustedIssuers is Ownable, SignerRole {
    EthereumDIDRegistry ethereumDIDRegistry;

    struct TrustedIssuer {
        address moderator;
        string issuerDID;
        string id;
        string name;
        string country;
        bool status;
        mapping(bytes32 => Document) documents;
    }

    struct Document {
        string vcCode;
        string title;
        string revision;
        string status;
        uint256 dateStart;
    }

    mapping(bytes32 => TrustedIssuer) internal trustedIssuers;
    mapping(bytes32 => bytes32) internal documentToTrustedIssuer;
    bytes32[] public trustedIssuerIndex;
    mapping(bytes32 => bytes32[]) internal documentIndex;

    event TrustedIssuerAdded (string indexed issuerDID);
    event DocumentAdded (bytes32 indexed documentHash, bytes32 indexed trustedIssuerDIDHash);

    constructor (address ethereumDIDRegistryAddress) public {
        require(ethereumDIDRegistryAddress != address(0));

        ethereumDIDRegistry = EthereumDIDRegistry(ethereumDIDRegistryAddress);
    }


    function addTrustedIssuer(string calldata issuerDID, string calldata name, string calldata country)
    external
    onlySigner
    {
        require(bytes(issuerDID).length != 0, 'Invalid Issuer DID address');
        require(trustedIssuers[keccak256(abi.encodePacked(issuerDID))].status != true, 'Trusted Issuer already exists');

        TrustedIssuer memory trustedIssuer;
        trustedIssuer.status = true;
        trustedIssuer.moderator = _msgSender();
        trustedIssuer.issuerDID = issuerDID;
        trustedIssuer.name = name;
        trustedIssuer.country = country;
        trustedIssuers[keccak256(abi.encodePacked(issuerDID))] = trustedIssuer;
        trustedIssuerIndex.push(keccak256(abi.encodePacked(issuerDID)));
        emit TrustedIssuerAdded(issuerDID);
    }

    function addDocument(
        string calldata issuerDID,
        string calldata vcCode,
        string calldata title,
        string calldata revision,
        string calldata status,
        uint256 dateStart
    )
    external
    onlySigner
    returns (bool)
    {
        bytes32 DIDHash = keccak256(abi.encodePacked(issuerDID));

        // check for empty vccode
        require(keccak256(abi.encodePacked(vcCode)) != '');
        // check document is not created and entity exists
        require(trustedIssuers[DIDHash].status != false, 'Trusted Issuer does not exist');
        require(bytes(trustedIssuers[DIDHash].documents[keccak256(abi.encodePacked(vcCode))].vcCode).length == 0, 'Document already defined');


        // check the moderator for the current entity
        require(trustedIssuers[DIDHash].moderator == _msgSender(), 'You are currently not moderating this Trusted Issuer');
        // check document type exists

        // define the document
        Document memory document;
        document.vcCode = vcCode;
        document.title = title;
        document.revision = revision;
        document.status = status;
        document.dateStart = dateStart;
        // insert the document into storage mapping
        trustedIssuers[DIDHash].documents[keccak256(abi.encodePacked(vcCode))] = document;

        // add document to issuer index
        documentToTrustedIssuer[keccak256(abi.encodePacked(vcCode))] = DIDHash;

        // add document to documentIndex
        documentIndex[DIDHash].push(keccak256(abi.encodePacked(vcCode)));

        // emit event
        emit DocumentAdded(keccak256(abi.encodePacked(vcCode)), DIDHash);
        return true;
    }

    function isTrustedIssuer(string calldata addr)
    external
    view
    returns (bool)
    {
        return trustedIssuers[keccak256(abi.encodePacked(addr))].moderator != address(0);
    }

    function getNrOfTrustedIssuers()
    view
    external
    returns (uint256)
    {
        return trustedIssuerIndex.length;
    }

    function getTrustedIssuer(string calldata addr)
    view
    external
    returns (address moderator, string memory issuerDID, string memory name, string memory country, bool status)
    {
        bytes32 DIDHash = keccak256(abi.encodePacked(addr));
        TrustedIssuer memory ts = trustedIssuers[DIDHash];

        require(ts.status != false, 'Trusted Issuer does not exist');

        return (ts.moderator, ts.issuerDID, ts.name, ts.country, ts.status);
    }

    function getAllDocumentIndexes(string calldata issuerDID)
    view
    external
    returns (bytes32[] memory)
    {
        return documentIndex[keccak256(abi.encodePacked(issuerDID))];
    }

    function getDocument(string calldata issuerDID, bytes32 _documentIndex)
    view
    external
    returns (string memory vcCode, string memory title, string memory revision, string memory status, uint256 dateStart)
    {
        Document memory document = trustedIssuers[keccak256(abi.encodePacked(issuerDID))].documents[_documentIndex];
        require(bytes(document.title).length != 0, 'Document does not exist');

        return (document.vcCode, document.title, document.revision, document.status, document.dateStart);
    }
}
