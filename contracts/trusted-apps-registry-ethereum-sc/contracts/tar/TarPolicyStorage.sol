// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;
import "./TarPolicyStoreLib.sol";

contract TarPolicyStorage {
    // Creates and returns the storage pointer to the struct.
    function policyStorage()
        internal
        pure
        returns (TarPolicyStoreLib.Policies storage ms)
    {
        bytes32 position = TarPolicyStoreLib
            .TAR_POLICY_DIAMOND_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }
}
