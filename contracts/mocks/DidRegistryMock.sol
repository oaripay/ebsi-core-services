// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

contract DidRegistryMock {
    bool public didResult;

    function checkController(bytes calldata identifier, address ctrl)
        external
        view
        returns (bool)
    {
        return didResult;
    }

    function setDidResult(bool newDidResult) external {
        didResult = newDidResult;
    }
}
