// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

/**
 * @dev Wrappers over Solidity's array push operations with added check
 *
 */
library SafeAddArray {
    /**
     * @dev push a new value into a storage array, checks for duplicate
     *
     */
    function add(bytes32[] storage array, bytes32 value) internal {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == value) {
                return;
            }
        }
        array.push(value);
    }

    /**
     * @dev push a new value into a string array, checks for duplicate
     *
     */
    function add(string[] storage array, string memory value) internal {
        bytes32 hashValue = keccak256(bytes(value));
        for (uint256 i = 0; i < array.length; i++) {
            if (keccak256(bytes(array[i])) == hashValue) {
                return;
            }
        }
        array.push(value);
    }
}
