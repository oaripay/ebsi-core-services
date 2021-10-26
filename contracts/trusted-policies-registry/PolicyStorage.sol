// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;

contract PolicyStorage {
    // The state variables we care about.
    bytes32 public constant POLICY_DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.policy.registry.storage");

    enum TYPE {TYPE_UINT256, TYPE_BYTES, TYPE_ADDRESS, TYPE_BYTES32, TYPE_STRING, TYPE_BOOLEAN}
    enum OPERATION {EQUAL /* @TODO: to be implemented: , GREATER_THAN, SMALLER_THAN */}
    enum OPERATION_TYPE {AND /* @TODO: to be implemented: OR, XOR, NOR **/}

    struct Policies {
        uint256 version;
        uint256 lastPolicyId;
        mapping (address => mapping (string => bytes)) userAttributes;
        mapping(uint => Policy) policies;
    }

    struct PolicyDefinition {
        string name;
        string attributeName;
        TYPE policyType;
        bytes value;
        OPERATION policyOperation;
    }

    struct Policy {
        OPERATION_TYPE opType;
        PolicyDefinition[]  policyDefinitions;
        string policyName;
    }

    // Creates and returns the storage pointer to the struct.
    function policyStorage() internal pure returns (Policies storage ps) {
        bytes32 position = POLICY_DIAMOND_STORAGE_POSITION;
        assembly {
            ps.slot := position
        }
    }
}
