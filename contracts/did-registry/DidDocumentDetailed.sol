// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "./DidDocumentStorage.sol";
import "./DidDocumentLib.sol";

contract DidDocumentDetailed is DidDocumentStorage {
    using DidDocumentLib for DidDocuments;

    function insertDidDocument(
        string memory did,
        string memory baseDocument,
        bytes memory publicKey,
        uint256 notBefore,
        uint256 notAfter
    ) external returns (bool) {
        DidDocuments storage ds = didDocumentStorage();
        return
            ds.insertDidDocument(
                did,
                baseDocument,
                publicKey,
                notBefore,
                notAfter
            );
    }
}
