pragma solidity >=0.4.21 <0.6.0;

import '../roles/roles/Ownable.sol';
import '../roles/roles/SignerRole.sol';

contract UniversitiesTrustedIssuers is Ownable, SignerRole {

    // external variables
    enum DocumentType {DEMO_EID_TYPE, DEMO_BACHELOR_TYPE, DEMO_MASTER_TYPE}

    // variable types
    struct TrustedIssuer {
        // the user who has access to change data in here. when a issuer is created msg.sender is automatically added. msg.sender has to be a signer
        address moderator;
        // DID of the trusted entity (university)
        string issuerDID;

        string id;
        string legalIdentifier;
        string vatIdentifier;
        string taxIdentifier;
        string identifier;
        string preferredName;
        string alternativeName;

        string homepage;
        string escoOrganizationType;
        string siteLocation;
        // status of the issuer
        bool status;
        // the list of the documents whereas the key is the hash of the document vsCode
        mapping(bytes32 => Document) documents;
        mapping(uint256 => Accreditation) hasAccreditations;
        uint256 hasAccreditationsIndex;
    }

    struct Accreditation {
        string targetFramework;
        string targetResource;
    }

    struct Document {
        string vcCode;
        string title;
        // revision is academic Level
        string revision;
        // status is a string representing the government laws and the date or disabled of inactive document.
        string status;
        // type of the document
        DocumentType documentType;
        // a timestamp from when the document is available to be issued from.
        uint256 dateStart;
    }

    // the list of the data present in the smart contact

    // the list of the trusted issuers - its a mapping where the key is the did of the trusted entity
    mapping(bytes32 => TrustedIssuer) internal trustedIssuers;

    // a mapping which map every document hash to a trusted university
    // we need it in order to easily access the trusted issuer and check the document is part of the issuer issuing list.
    mapping(bytes32 => bytes32) internal documentToTrustedIssuer;

    // an index to help us get all the trusted issuers from the mapping
    bytes32[] public trustedIssuerIndex;

    // an index to help us get all the documents from a trusted issuer
    mapping(bytes32 => bytes32[]) internal documentIndex;

    // events
    event TrustedIssuerAdded (string indexed issuerDID);
    event TrustedIssuerUpdated (string indexed issuerDID);
    event DocumentAdded (bytes32 indexed documentHash, bytes32 indexed trustedIssuerDIDHash);
    event AccreditationAdded (string targetFramework);

    // constructor; make trusted issuer list aware of did registry in order to verify dids
    constructor () public {
    }

    function addTrustedIssuer(string calldata issuerDID, string calldata preferredName, string calldata alternativeName, string calldata homepage, string calldata escoOrganizationType, string calldata siteLocation)
    external
    onlySigner
    {
        require(bytes(issuerDID).length != 0, 'Invalid Issuer DID');
        require(trustedIssuers[keccak256(abi.encodePacked(issuerDID))].status != true, 'Trusted Issuer already exists');
        TrustedIssuer memory trustedIssuer;
        trustedIssuer.status = true;
        trustedIssuer.hasAccreditationsIndex = 0;
        trustedIssuer.moderator = _msgSender();
        trustedIssuer.issuerDID = issuerDID;
        trustedIssuer.preferredName = preferredName;
        trustedIssuer.alternativeName = alternativeName;
        trustedIssuer.homepage = homepage;
        trustedIssuer.escoOrganizationType = escoOrganizationType;
        trustedIssuer.siteLocation = siteLocation;
        trustedIssuers[keccak256(abi.encodePacked(issuerDID))] = trustedIssuer;
        trustedIssuerIndex.push(keccak256(abi.encodePacked(issuerDID)));
        emit TrustedIssuerAdded(issuerDID);
    }

    function updateTrustedIssuer(string calldata issuerDID, string calldata preferredName, string calldata alternativeName, string calldata homepage, string calldata escoOrganizationType, string calldata siteLocation)
    external
    onlySigner
    {
        require(bytes(issuerDID).length != 0, 'Invalid Issuer DID');
        require(trustedIssuers[keccak256(abi.encodePacked(issuerDID))].status == true, 'Trusted Issuer does not exists');
        TrustedIssuer storage trustedIssuer = trustedIssuers[keccak256(abi.encodePacked(issuerDID))];
        require(trustedIssuer.moderator == _msgSender(), 'This trusted issuer has to be moderated by the same account');
        trustedIssuer.preferredName = preferredName;
        trustedIssuer.alternativeName = alternativeName;
        trustedIssuer.homepage = homepage;
        trustedIssuer.escoOrganizationType = escoOrganizationType;
        trustedIssuer.siteLocation = siteLocation;
        emit TrustedIssuerUpdated(issuerDID);
    }

    function addTrustedIssuerIdentifiers(string calldata issuerDID, string calldata id, string calldata legalIdentifier, string calldata vatIdentifier, string calldata taxIdentifier, string calldata identifier)
    external
    onlySigner
    {
        require(bytes(issuerDID).length != 0, 'Invalid Issuer DID');
        TrustedIssuer storage ts = trustedIssuers[keccak256(abi.encodePacked(issuerDID))];
        ts.id = id;
        ts.legalIdentifier = legalIdentifier;
        ts.vatIdentifier = vatIdentifier;
        ts.taxIdentifier = taxIdentifier;
        ts.identifier = identifier;
    }

    function addAccreditation(string calldata issuerDID, string calldata targetFramework, string calldata targetResource)
    external
    onlySigner
    returns (bool)
    {
        bytes32 DIDHash = keccak256(abi.encodePacked(issuerDID));
        TrustedIssuer storage ts = trustedIssuers[DIDHash];

        require(trustedIssuers[DIDHash].status != false, 'Trusted Issuer does not exist');



        // check the moderator for the current entity
        require(trustedIssuers[DIDHash].moderator == _msgSender(), 'You are currently not moderating this Trusted Issuer');

        ts.hasAccreditations[ts.hasAccreditationsIndex] = Accreditation(targetFramework, targetResource);
        ts.hasAccreditationsIndex++;

        emit AccreditationAdded(targetFramework);

        return true;
    }

    function addDocument(
        string calldata issuerDID,
        string calldata vcCode,
        string calldata title,
        string calldata revision,
        string calldata status,
        uint documentType,
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
        require(documentType <= uint(DocumentType.DEMO_MASTER_TYPE), 'This document type is not defined');

        // define the document
        Document memory document;
        document.vcCode = vcCode;
        document.title = title;
        document.revision = revision;
        document.status = status;
        document.dateStart = dateStart;
        document.documentType = DocumentType(documentType);
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

    function getTrustedIssuerByIndex(uint256 index)
    external
    view
    returns (address moderator, string memory issuerDID, string memory preferredName, string memory alternativeName, string memory homepage, string memory escoOrganizationType, string memory siteLocation, bool status)
    {
        bytes32 DIDHash = trustedIssuerIndex[index];
        TrustedIssuer memory ts = trustedIssuers[DIDHash];

        return (ts.moderator, ts.issuerDID, ts.preferredName, ts.alternativeName, ts.homepage, ts.escoOrganizationType, ts.siteLocation, ts.status);
    }

    function getTrustedIssuer(string calldata addr)
    view
    external
    returns (address moderator, string memory issuerDID, string memory preferredName, string memory alternativeName, string memory homepage, string memory escoOrganizationType, string memory siteLocation, bool status)
    {
        bytes32 DIDHash = keccak256(abi.encodePacked(addr));

        require(trustedIssuers[DIDHash].status != false, 'Trusted Issuer does not exist');

        TrustedIssuer memory ts = trustedIssuers[DIDHash];
        return (ts.moderator, ts.issuerDID, ts.preferredName, ts.alternativeName, ts.homepage, ts.escoOrganizationType, ts.siteLocation, ts.status);
    }

    function getTrustedIssuerIdentifiers(string calldata addr)
    view
    external
    returns (string memory id, string memory legalIdentifier, string memory vatIdentifier, string memory taxIdentifier, string memory identifier)
    {
        bytes32 DIDHash = keccak256(abi.encodePacked(addr));

        require(trustedIssuers[DIDHash].status != false, 'Trusted Issuer does not exist');

        TrustedIssuer memory ts = trustedIssuers[DIDHash];

        return (ts.id, ts.legalIdentifier, ts.vatIdentifier, ts.taxIdentifier, ts.identifier);
    }

    function getAllDocumentIndexes(string calldata issuerDID)
    view
    external
    returns (bytes32[] memory)
    {
        return documentIndex[keccak256(abi.encodePacked(issuerDID))];
    }

    function getNrOfAccreditations(string calldata issuerDID)
    view
    external
    returns (uint256 nrOfAccreditations)
    {
        bytes32 DIDHash = keccak256(abi.encodePacked(issuerDID));

        TrustedIssuer memory ts = trustedIssuers[DIDHash];

        require(bytes(issuerDID).length != 0, 'Invalid Issuer DID');
        require(trustedIssuers[DIDHash].status != false, 'Trusted Issuer does not exist');

        return ts.hasAccreditationsIndex + 1;
    }

    function getAccreditation(string calldata issuerDID, uint256 _index)
    view
    external
    returns (string memory targetFramework, string memory targetResource)
    {
        bytes32 DIDHash = keccak256(abi.encodePacked(issuerDID));

        return (trustedIssuers[DIDHash].hasAccreditations[_index].targetFramework, trustedIssuers[DIDHash].hasAccreditations[_index].targetResource);
    }

    function getDocument(string calldata issuerDID, bytes32 _documentIndex)
    view
    external
    returns (string memory vcCode, string memory title, string memory revision, string memory status, string memory documentType, uint256 dateStart)
    {
        Document memory document = trustedIssuers[keccak256(abi.encodePacked(issuerDID))].documents[_documentIndex];
        require(bytes(document.title).length != 0, 'Document does not exist');
        return (document.vcCode, document.title, document.revision, document.status, getDocumentTypeByKey(document.documentType), document.dateStart);
    }

    function getNrOfTrustedIssuers()
    view
    external
    returns (uint256)
    {
        return trustedIssuerIndex.length;
    }

    function getDocumentTypeByKey(DocumentType _documentType) internal pure returns (string memory)
    {
        require(uint8(_documentType) <= 2, 'Document type does not exist');
        if (DocumentType.DEMO_EID_TYPE == _documentType) return 'Demo EID doc';
        if (DocumentType.DEMO_BACHELOR_TYPE == _documentType) return 'Demo Bachelor doc';
        if (DocumentType.DEMO_MASTER_TYPE == _documentType) return 'Demo Master doc';
        return 'Document type does not exist';
    }
}
