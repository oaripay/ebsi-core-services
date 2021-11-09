// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.9;
pragma experimental ABIEncoderV2;

import "../bootstrap-ethereum-sc/contracts/utils/upgradeability/Initializable.sol";
import "./PolicyStorage.sol";
import "../bootstrap-ethereum-sc/contracts/utils/Pagination.sol";
import "./utils/Strings.sol";

abstract contract PolicyDetailed is PolicyStorage {
    /**
     * @dev insert an Policy
     */
    function insertPolicy(
        OPERATION_TYPE opType,
        PolicyCondition[] calldata policyConditions,
        string calldata policyName,
        string calldata registry
    ) external {
        {
            // to make sure not going into stack too deep
            require(bytes(policyName).length > 0, "Policy: name required");
            require(bytes(registry).length > 0, "Policy: registry required");
            PolicyContractStorage storage ps = policyStorage();
            uint256 policyId = ps.lastPolicyId + 1;
            ps.lastPolicyId = policyId;
            Policy storage policy = ps.policies[policyId];
            policy.opType = opType;
            policy.status = true;
            policy.policyName = policyName;
            policy.registry = registry;
            for (uint256 i; i < policyConditions.length; i++) {
                require(
                    bytes(policyConditions[i].attributeName).length > 0,
                    string(
                        abi.encodePacked(
                            "Policy: invalid attribute name on counter ",
                            Strings.toString(i)
                        )
                    )
                );
                policy.policyConditionsCount++;
                policy.policyConditions[
                    policy.policyConditionsCount
                ] = policyConditions[i];
            }
        }
    }

    /**
     * @dev add a new policy's attribute
     */
    function addPolicyConditions(
        uint256 policyId,
        PolicyCondition[] calldata policyConditions
    ) external {
        require(policyId > 0, "Policy: invalid policy Id");
        PolicyContractStorage storage ps = policyStorage();
        Policy storage policy = ps.policies[policyId];
        require(policy.status, "Policy: policy does not exist or inactive");
        for (uint256 i; i < policyConditions.length; i++) {
            require(
                bytes(policyConditions[i].attributeName).length > 0,
                string(
                    abi.encodePacked(
                        "Policy: invalid attribute name on counter ",
                        Strings.toString(i)
                    )
                )
            );
            policy.policyConditionsCount++;
            policy.policyConditions[
                policy.policyConditionsCount
            ] = policyConditions[i];
        }
    }

    function deletePolicyCondition(uint256 policyId, uint256 policyConditionId)
        external
    {
        require(policyId > 0, "Policy: invalid policy Id");
        PolicyContractStorage storage ps = policyStorage();
        Policy storage policy = ps.policies[policyId];
        require(policy.status, "Policy: policy does not exist or inactive");
        require(
            policy.policyConditionsCount > policyConditionId,
            "Policy: invalid condition"
        );
        policy.policyConditions[policyConditionId] = policy.policyConditions[
            policy.policyConditionsCount
        ];
        bytes memory zeroBytes;
        policy.policyConditions[policy.policyConditionsCount] = PolicyCondition(
            "",
            "",
            TYPE.TYPE_BYTES32,
            zeroBytes,
            OPERATION.EQUAL
        );
        policy.policyConditionsCount--;
    }

    function updatePolicy(
        uint256 policyId,
        OPERATION_TYPE opType,
        string calldata policyName,
        string calldata registry
    ) external {
        require(policyId > 0, "Policy: invalid policy Id");
        PolicyContractStorage storage ps = policyStorage();
        Policy storage policy = ps.policies[policyId];
        require(policy.status, "Policy: policy does not exist or inactive");
        policy.opType = opType;
        policy.policyName = policyName;
        policy.registry = registry;
    }

    function deactivatePolicy(uint256 policyId) external {
        require(policyId > 0, "Policy: invalid policy Id");
        PolicyContractStorage storage ps = policyStorage();
        Policy storage policy = ps.policies[policyId];
        require(policy.status, "Policy: invalid policy");
        policy.status = false;
    }

    function activatePolicy(uint256 policyId) external {
        require(policyId > 0, "Policy: invalid policy Id");
        PolicyContractStorage storage ps = policyStorage();
        Policy storage policy = ps.policies[policyId];
        require(
            policy.status == false && ps.lastPolicyId >= policyId,
            "Policy: invalid policy"
        );
        policy.status = true;
    }

    uint256[50] private ______gap;
}
