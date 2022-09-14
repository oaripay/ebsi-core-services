// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "../bootstrap-ethereum-sc/contracts/utils/Pagination.sol";
import "./DidDocumentStorage.sol";

library DidDocumentLib {
    using Pagination for string[];

    function insertDidDocument(
        DidDocumentStorage.DidDocuments storage ds,
        string memory did,
        string memory baseDocument,
        string memory vMethodId,
        bytes memory publicKey,
        bool isSecp256k1,
        uint256 notBefore,
        uint256 notAfter
    ) external returns (bool) {
        DidDocumentStorage.DidDocument storage d = ds.didList[did];
        require(bytes(did).length > 0, "invalid did");
        require(bytes(baseDocument).length > 0, "invalid baseDocument");
        require(bytes(vMethodId).length > 0, "invalid vMethodId");
        require(publicKey.length > 0, "invalid publicKey");
        require(isSecp256k1, "first publicKey must be for secp256k1");
        require(notAfter == 0 || notBefore <= notAfter, "invalid dates");

        require(bytes(d.baseDocument).length == 0, "did already exist");

        d.baseDocument = baseDocument;
        d.controllers.push(did);
        d.vMethods[vMethodId] = DidDocumentStorage.VMethod(
            publicKey,
            true,
            false
        );
        d.capabilityInvocations.push(
            DidDocumentStorage.VRelationship(
                "capabilityInvocation",
                vMethodId,
                notBefore,
                notAfter
            )
        );

        return true;
    }

    function getDidDocument(
        DidDocumentStorage.DidDocuments storage ds,
        string memory did
    )
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
        DidDocumentStorage.DidDocument storage d = ds.didList[did];
        baseDocument = d.baseDocument;
        controllers = d.controllers;
        string[] memory vMethodIdsAux = new string[](50);
        DidDocumentStorage.VMethod[]
            memory vMethodsAux = new DidDocumentStorage.VMethod[](50);
        DidDocumentStorage.VRelationship[]
            memory vRelationshipsAux = new DidDocumentStorage.VRelationship[](
                50
            );
        uint256 sizeVMethods = 0;
        uint256 sizeVRelationships = 0;
        for (uint256 i = 0; i < d.vRelationships.length; i++) {
            vRelationshipsAux[sizeVRelationships] = d.vRelationships[i];
            sizeVRelationships++;
            bool vMethodAdded = false;
            string memory vMethodId = d.vRelationships[i].vMethodId;

            for (uint256 j = 0; j < sizeVMethods; j++) {
                if (
                    keccak256(bytes(vMethodId)) ==
                    keccak256(bytes(vMethodIdsAux[j]))
                ) {
                    vMethodAdded = true;
                    break;
                }
            }
            if (!vMethodAdded) {
                vMethodIdsAux[sizeVMethods] = vMethodId;
                vMethodsAux[sizeVMethods] = d.vMethods[vMethodId];
                sizeVMethods++;
            }
        }

        for (uint256 i = 0; i < d.capabilityInvocations.length; i++) {
            vRelationshipsAux[sizeVRelationships] = d.capabilityInvocations[i];
            sizeVRelationships++;
            bool vMethodAdded = false;
            string memory vMethodId = d.capabilityInvocations[i].vMethodId;

            for (uint256 j = 0; j < sizeVMethods; j++) {
                if (
                    keccak256(bytes(vMethodId)) ==
                    keccak256(bytes(vMethodIdsAux[j]))
                ) {
                    vMethodAdded = true;
                    break;
                }
            }
            if (!vMethodAdded) {
                vMethodIdsAux[sizeVMethods] = vMethodId;
                vMethodsAux[sizeVMethods] = d.vMethods[vMethodId];
                sizeVMethods++;
            }
        }

        // copy auxiliar arrays to the result
        vMethodIds = new string[](sizeVMethods);
        vMethods = new DidDocumentStorage.VMethod[](sizeVMethods);
        vRelationships = new DidDocumentStorage.VRelationship[](
            sizeVRelationships
        );
        for (uint256 i = 0; i < sizeVMethods; i++) {
            vMethodIds[i] = vMethodIdsAux[i];
            vMethods[i] = vMethodsAux[i];
        }
        for (uint256 i = 0; i < sizeVRelationships; i++) {
            vRelationships[i] = vRelationshipsAux[i];
        }
    }
}
