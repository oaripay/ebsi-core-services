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
        bytes memory publicKey,
        uint256 notBefore,
        uint256 notAfter
    ) external returns (bool) {
        return true;
    }
}
