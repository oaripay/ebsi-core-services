// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
import "./PolicyStoreLib.sol";

contract PolicyStorage {
    // Creates and returns the storage pointer to the struct.
    function policyStorage()
        internal
        pure
        returns (PolicyStoreLib.Policies storage ms)
    {
        bytes32 position = PolicyStoreLib.TAR_POLICY_DIAMOND_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }
}
