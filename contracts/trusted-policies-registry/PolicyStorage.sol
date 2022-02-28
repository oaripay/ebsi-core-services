// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.9;

contract PolicyStorage {
    // The state variables we care about.
    bytes32 public constant POLICY_DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.policy.registry.storage");

    enum TYPE {
        TYPE_UINT256,
        TYPE_BYTES,
        TYPE_ADDRESS,
        TYPE_BYTES32,
        TYPE_STRING,
        TYPE_BOOLEAN
    }

    enum OPERATION {
        EQUAL /* @TODO: to be implemented: , GREATER_THAN, SMALLER_THAN */
    }

    // solhint-disable-next-line contract-name-camelcase
    enum OPERATION_TYPE {
        AND,
        OR /* @TODO: to be implemented: XOR, NOR **/
    }

    // solhint-disable-next-line contract-name-camelcase
    enum ASSERT_TYPE {
        DID
    }

    struct PolicyContractStorage {
        uint256 version;
        uint256 policyCount;
        mapping(address => mapping(string => bytes)) userAttributes;
        mapping(address => string[]) listOfUserAttributes;
        mapping(string => uint256) policyNameToPolicyId;
        mapping(string => bool) policyNameDefined;
        mapping(string => uint256[]) descriptionToPolicyIds;
        address[] addresses;
        mapping(address => bool) userAddressExists;
        mapping(uint256 => Policy) policies;
    }

    struct PolicyCondition {
        string name;
        string attributeName; //updateDidDocument
        TYPE typeOfValue;
        bytes value; //assertDid
        OPERATION attributeOperation;
    }

    struct Policy {
        OPERATION_TYPE opType;
        mapping(uint256 => PolicyCondition) policyConditions;
        uint256 policyConditionsCount;
        string policyName;
        string description;
        bool status;
    }

    // Creates and returns the storage pointer to the struct.
    function policyStorage()
        internal
        pure
        returns (PolicyContractStorage storage ps)
    {
        bytes32 position = POLICY_DIAMOND_STORAGE_POSITION;
        assembly {
            ps.slot := position
        }
    }

    bytes32 public constant DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.diamond.storage.proxy");

    struct DiamondStorage {
        // owner of the contract
        address proxyAdmin;
        address implementation;
    }

    function diamondStorage()
        internal
        pure
        returns (DiamondStorage storage ds)
    {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }
}
