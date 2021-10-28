pragma solidity ^0.8.9;

import "hardhat/console.sol";

contract Abac {
    enum TYPE {
        TYPE_INTEGER,
        TYPE_ADDRESS,
        TYPE_BYTES32
    }
    enum OPERATION {
        EQUAL,
        GREATER_THAN,
        SMALLER_THAN
    }
    enum OPERATION_TYPE {
        AND,
        OR
    }

    struct Policy {
        string name;
        string attributeName;
        TYPE policyType;
        bytes value;
        OPERATION policyOperation;
    }

    struct PolicyType {
        OPERATION_TYPE op_type;
        Policy[] policies;
    }

    event Success(string str);

    mapping(address => mapping(string => bytes)) public userAttributes;
    Policy[] public policyList;
    mapping(uint256 => PolicyType) public complexPolicies;

    modifier applyPolicy(uint256 policyId) {
        Policy memory appliedPolicy = policyList[policyId];

        if (appliedPolicy.policyType == TYPE.TYPE_INTEGER) {
            uint256 policyValue = toUint256(appliedPolicy.value, 0);
            if (appliedPolicy.policyOperation == OPERATION.EQUAL) {
                // get user userAttribute
                uint256 userAttributeToBeChecked = toUint256(
                    userAttributes[msg.sender][appliedPolicy.attributeName],
                    0
                );
                require(
                    userAttributeToBeChecked == policyValue,
                    "Attribute not met requirements"
                );
            } else if (
                appliedPolicy.policyOperation == OPERATION.GREATER_THAN
            ) {
                // to be implemented
            }
        } else if (appliedPolicy.policyType == TYPE.TYPE_ADDRESS) {
            // to be implemented
        } else if (appliedPolicy.policyType == TYPE.TYPE_BYTES32) {
            // to be implemented
        }
        _;
    }

    constructor() {
        // define policies
        Policy memory firstPolicy;
        firstPolicy.name = string("one policy");
        firstPolicy.policyType = TYPE.TYPE_INTEGER;
        firstPolicy.value = abi.encodePacked(uint256(1));
        firstPolicy.attributeName = string("attribute1");
        firstPolicy.policyOperation = OPERATION.EQUAL;
        policyList.push(firstPolicy);
    }

    function addUserAttribute(
        address user,
        string calldata attribute,
        bytes calldata value
    ) public /* modifier onlyOwner here */
    {
        userAttributes[user][attribute] = value;
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

    function methodAppliedPolicy()
        external
        applyPolicy(0)
        returns (string memory)
    {
        emit Success("methodAppliedPolicy");
        return string("methodAppliedPolicy");
    }
}
