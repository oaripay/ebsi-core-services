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

    event VerificationMethodAdded(
        string did,
        string vMethodId,
        bytes publicKey,
        bool isSecp256k1
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
