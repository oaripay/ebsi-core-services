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
}
