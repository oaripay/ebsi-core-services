// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.9;

import "../DidDocumentStorage.sol";

/**
 * @title Interface DID Registry to check controllers
 */
interface IDidRegistryV4 {
    function checkController(
        bytes calldata identifier,
        address ctrl
    ) external view returns (bool);

    function getDidDocument(
        string memory did
    )
        external
        view
        returns (
            string memory baseDocument,
            string[] memory controllers,
            string[] memory vMethodIds,
            DidDocumentStorage.VMethod[] memory vMethods,
            DidDocumentStorage.VRelationship[] memory vRelationships
        );
}
