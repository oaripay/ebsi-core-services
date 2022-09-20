// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "./DidDocumentStorage.sol";
import "./DidDocumentLib.sol";

contract DidDocumentDetailed is DidDocumentStorage {
    using DidDocumentLib for DidDocuments;

    event DidDocumentInserted(
        string did,
        string baseDocument,
        string vMethodId,
        bytes publicKey,
        bool isSecp256k1,
        uint256 notBefore,
        uint256 notAfter
    );

    event BaseDocumentUpdated(string did, string baseDocument);

    event ControllerAdded(string did, string controller);

    event ControllerRevoked(string did, string controller);

    event VerificationMethodAdded(
        string did,
        string vMethodId,
        bytes publicKey,
        bool isSecp256k1
    );

    event VerificationRelationshipAdded(
        string did,
        string name,
        string vMethodId,
        uint256 notBefore,
        uint256 notAfter
    );

    event VerificationMethodRevoked(
        string did,
        string vMethodId,
        uint256 notAfter
    );

    event VerificationMethodExpired(
        string did,
        string vMethodId,
        uint256 notAfter
    );

    function insertDidDocument(
        string memory did,
        string memory baseDocument,
        string memory vMethodId,
        bytes memory publicKey,
        bool isSecp256k1,
        uint256 notBefore,
        uint256 notAfter
    ) external returns (bool) {
        DidDocuments storage ds = didDocumentStorage();
        bool result = ds.insertDidDocument(
            did,
            baseDocument,
            vMethodId,
            publicKey,
            isSecp256k1,
            notBefore,
            notAfter
        );
        emit DidDocumentInserted(
            did,
            baseDocument,
            vMethodId,
            publicKey,
            isSecp256k1,
            notBefore,
            notAfter
        );
        return result;
    }

    function updateBaseDocument(string memory did, string memory baseDocument)
        external
        returns (bool)
    {
        DidDocuments storage ds = didDocumentStorage();
        bool result = ds.updateBaseDocument(did, baseDocument);
        emit BaseDocumentUpdated(did, baseDocument);
        return result;
    }

    function addController(string memory did, string memory controller)
        external
        returns (bool)
    {
        DidDocuments storage ds = didDocumentStorage();
        bool result = ds.addController(did, controller);
        emit ControllerAdded(did, controller);
        return result;
    }

    function revokeController(string memory did, string memory controller)
        external
        returns (bool)
    {
        DidDocuments storage ds = didDocumentStorage();
        bool result = ds.revokeController(did, controller);
        emit ControllerRevoked(did, controller);
        return result;
    }

    function addVerificationMethod(
        string memory did,
        string memory vMethodId,
        bytes memory publicKey,
        bool isSecp256k1
    ) external returns (bool) {
        DidDocuments storage ds = didDocumentStorage();
        bool result = ds.addVerificationMethod(
            did,
            vMethodId,
            publicKey,
            isSecp256k1
        );
        emit VerificationMethodAdded(did, vMethodId, publicKey, isSecp256k1);
        return result;
    }

    function addVerificationRelationship(
        string memory did,
        string memory name,
        string memory vMethodId,
        uint256 notBefore,
        uint256 notAfter
    ) external returns (bool) {
        DidDocuments storage ds = didDocumentStorage();
        bool result = ds.addVerificationRelationship(
            did,
            name,
            vMethodId,
            notBefore,
            notAfter
        );
        emit VerificationRelationshipAdded(
            did,
            name,
            vMethodId,
            notBefore,
            notAfter
        );
        return result;
    }

    function revokeVerificationMethod(
        string memory did,
        string memory vMethodId,
        uint256 notAfter
    ) external returns (bool) {
        DidDocuments storage ds = didDocumentStorage();
        bool result = ds.revokeVerificationMethod(did, vMethodId, notAfter);
        emit VerificationMethodRevoked(did, vMethodId, notAfter);
        return result;
    }

    function expireVerificationMethod(
        string memory did,
        string memory vMethodId,
        uint256 notAfter
    ) external returns (bool) {
        DidDocuments storage ds = didDocumentStorage();
        bool result = ds.expireVerificationMethod(did, vMethodId, notAfter);
        emit VerificationMethodExpired(did, vMethodId, notAfter);
        return result;
    }

    function getDidDocument(string memory did)
        public
        view
        returns (
            string memory baseDocument,
            string[] memory controllers,
            string[] memory vMethodIds,
            DidDocumentStorage.VMethod[] memory vMethods,
            DidDocumentStorage.VRelationship[] memory vRelationships
        )
    {
        DidDocuments storage ds = didDocumentStorage();
        return ds.getDidDocument(did);
    }
}
