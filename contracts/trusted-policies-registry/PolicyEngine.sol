// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;
pragma experimental ABIEncoderV2;

import "./PolicyStorage.sol";
import "../bootstrap-ethereum-sc/contracts/utils/Pagination.sol";

abstract contract PolicyEngine is PolicyStorage {
    function checkPolicy(uint256 policyId, address user)
        external
        view
        returns (bool)
    {
        return _checkPolicy(policyId, user);
    }

    function checkPolicy(string calldata policyName, address user)
        external
        view
        returns (bool)
    {
        PolicyContractStorage storage ps = policyStorage();
        require(ps.policyNameDefined[policyName], "policy does not exists");
        return _checkPolicy(ps.policyNameToPolicyId[policyName], user);
    }

    function _checkPolicy(uint256 policyId, address user)
        internal
        view
        returns (bool)
    {
        PolicyContractStorage storage ps = policyStorage();
        require(ps.policyCount > policyId, "Policy: invalid policy");

        Policy storage policy = ps.policies[policyId];
        require(policy.status, "Policy: inactive");

        if (policy.opType == OPERATION_TYPE.AND) {
            // applied policy for AND OPS
            if (policy.policyConditionsCount == 0) {
                return false;
            }
            for (uint256 i = 0; i < policy.policyConditionsCount; i++) {
                bytes memory userAttrValue = ps.userAttributes[user][
                    policy.policyConditions[i].attributeName
                ];
                if (userAttrValue.length == 0) {
                    // attribute does not exist
                    return false;
                }
                if (
                    policy.policyConditions[i].typeOfValue == TYPE.TYPE_BYTES32
                ) {
                    // cast value to bytes32
                    if (
                        toBytes32(policy.policyConditions[i].value, 0) !=
                        toBytes32(userAttrValue, 0)
                    ) {
                        // attr didnt check
                        return false;
                    }
                } else if (
                    policy.policyConditions[i].typeOfValue == TYPE.TYPE_UINT256
                ) {
                    // cast value to uint256
                    if (
                        toUint256(policy.policyConditions[i].value, 0) !=
                        toUint256(userAttrValue, 0)
                    ) {
                        // attr didnt check
                        return false;
                    }
                } else if (
                    policy.policyConditions[i].typeOfValue == TYPE.TYPE_ADDRESS
                ) {
                    // cast value to address
                    if (
                        toAddress(policy.policyConditions[i].value, 0) !=
                        toAddress(userAttrValue, 0)
                    ) {
                        // attr didnt check
                        return false;
                    }
                } else if (
                    policy.policyConditions[i].typeOfValue == TYPE.TYPE_BOOLEAN
                ) {
                    // cast value to boolean
                    if (
                        toBool(policy.policyConditions[i].value, 0) !=
                        toBool(userAttrValue, 0)
                    ) {
                        // attr didnt check
                        return false;
                    }
                } else {
                    return false; // type not implemented
                }
            }
            return true; // all policy conditions matched user attribute
        } else if (policy.opType == OPERATION_TYPE.OR) {
            return false; // @TODO : to be implemented
        }
        // default return false;
        return false;
    }

    function toAddress(bytes memory _bytes, uint256 _start)
        internal
        pure
        returns (address)
    {
        require(_bytes.length >= _start + 20, "toAddress_outOfBounds");
        address tempAddress;

        assembly {
            tempAddress := div(
                mload(add(add(_bytes, 0x20), _start)),
                0x1000000000000000000000000
            )
        }

        return tempAddress;
    }

    function toUint256(bytes memory _bytes, uint256 _start)
        internal
        pure
        returns (uint256)
    {
        require(_bytes.length >= _start + 32, "toUint256_outOfBounds");
        uint256 tempUint;

        assembly {
            tempUint := mload(add(add(_bytes, 0x20), _start))
        }

        return tempUint;
    }

    function toBytes32(bytes memory _bytes, uint256 _start)
        internal
        pure
        returns (bytes32)
    {
        require(_bytes.length >= _start + 32, "toBytes32_outOfBounds");
        bytes32 tempBytes32;

        assembly {
            tempBytes32 := mload(add(add(_bytes, 0x20), _start))
        }

        return tempBytes32;
    }

    function toBool(bytes memory _bytes, uint256 _start)
        internal
        pure
        returns (bool)
    {
        require(_bytes.length >= _start + 32, "toBool_outOfBounds");
        bool tempBool;

        assembly {
            tempBool := mload(add(add(_bytes, 0x20), _start))
        }

        return tempBool;
    }
}
