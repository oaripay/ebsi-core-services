// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "@ebsiint-sc/did-registry-v4/contracts/did-registry/DidDocumentStorage.sol";

contract DidRegistryMock {
    bool public didResult;
    DidDocumentStorage.VMethod[] vMethods;
    DidDocumentStorage.VRelationship[] VRelationships;

    /**
     * @dev check controller is owner on a did identifier, return mock result
     * @param identifier bytes
     * @param ctrl address
     * @return didResult bool
     */
    function checkController(
        bytes calldata identifier,
        address ctrl
    ) external view returns (bool) {
        return didResult;
    }

    /**
     * @dev set did result mock value as state variable
     * @param newDidResult bool
     */
    function setDidResult(bool newDidResult) external {
        didResult = newDidResult;
    }

    function getDidDocument(
        string memory did
    )
        external
        view
        returns (
            string memory,
            string[] memory,
            string[] memory,
            DidDocumentStorage.VMethod[] memory,
            DidDocumentStorage.VRelationship[] memory
        )
    {
        string memory baseDocument = "some did document";
        string[] memory returnString = new string[](1);
        returnString[0] = baseDocument;
        return (
            baseDocument,
            returnString,
            returnString,
            vMethods,
            VRelationships
        );
    }
}
