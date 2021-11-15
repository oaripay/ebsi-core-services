// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.9;
pragma experimental ABIEncoderV2;

import "../bootstrap-ethereum-sc/contracts/utils/upgradeability/Initializable.sol";
import "./PolicyStorage.sol";
import "../bootstrap-ethereum-sc/contracts/utils/Pagination.sol";
import "./utils/Strings.sol";

abstract contract PolicyDetailed is PolicyStorage {
    using Pagination for uint256;

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
            uint256 policyId = ps.lastPolicyId;
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
            ps.lastPolicyId++;
        }
    }

    /**
     * @dev add a new policy's attribute
     */
    function addPolicyConditions(
        uint256 policyId,
        PolicyCondition[] calldata policyConditions
    ) external {
        PolicyContractStorage storage ps = policyStorage();

        require(
            bytes(ps.policies[policyId].policyName).length > 0,
            "Policy: invalid policy Id"
        );
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
            policy.policyConditions[
                policy.policyConditionsCount
            ] = policyConditions[i];
            policy.policyConditionsCount++;
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

    function getPolicies(uint256 page, uint256 pageSize)
        external
        view
        returns (
            uint256[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        require(pageSize <= 50, "PSize not <=50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");
        PolicyContractStorage storage ps = policyStorage();
        return ps.lastPolicyId.paginate(page, pageSize);
    }

    function getPolicy(uint256 _policyId)
        external
        view
        returns (
            uint256 policyId,
            string memory registry,
            string memory policyName,
            OPERATION_TYPE opType,
            bool status,
            PolicyCondition[] memory policyConditions
        )
    {
        PolicyContractStorage storage ps = policyStorage();
        require(ps.lastPolicyId >= _policyId, "Policy: invalid policy");
        Policy storage policy = ps.policies[_policyId];
        registry = policy.registry;
        policyId = _policyId;
        policyName = policy.policyName;
        opType = policy.opType;
        status = policy.status;
        for (uint256 i = 0; i <= policy.policyConditionsCount; i++) {
            policyConditions[i] = policy.policyConditions[i];
        }
    }

    uint256[50] private ______gap;
}
