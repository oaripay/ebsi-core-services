// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

contract DidRegistryMock {
    bool public didResult;

    function setDidResult(bool newDidResult) external {
        didResult = newDidResult;
    }

    function checkController(
        bytes calldata identifier,
        address ctrl
    ) external view returns (bool) {
        require(identifier.length > 0);
        require(ctrl != address(0));
        return didResult;
    }
}
