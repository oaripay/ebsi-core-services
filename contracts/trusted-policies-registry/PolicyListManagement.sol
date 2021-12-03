// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.9;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../bootstrap-ethereum-sc/contracts/utils/upgradeability/Initializable.sol";
import "./PolicyStorage.sol";
import "../bootstrap-ethereum-sc/contracts/utils/Pagination.sol";
import "./Roles.sol";

abstract contract PolicyListManagement is PolicyStorage, AccessControl, Roles {
    using Pagination for uint256;

    event PolicyInserted(
        uint256 indexed policyId,
        string policyName,
        string registry
    );
    event PolicyConditionInserted(
        uint256 indexed conditionId,
        string attributeName,
        bytes value
    );
    event PolicyConditionDeleted(
        uint256 indexed conditionId,
        string attributeName,
        bytes value
    );
    event PolicyUpdated(
        uint256 indexed policyId,
        string oldName,
        string newName,
        string oldRegistry,
        string newRegistry
    );
    event PolicyDeactivated(uint256 indexed policyId);
    event PolicyActivated(uint256 indexed policyId);

    /**
     * @dev insert an Policy
     */
    function insertPolicy(
        OPERATION_TYPE opType,
        PolicyCondition[] calldata policyConditions,
        string calldata policyName,
        string calldata registry
    ) external onlyRole(OPERATOR_ROLE) {
        {
            // to make sure not going into stack too deep
            require(bytes(policyName).length > 0, "Policy: name required");
            require(bytes(registry).length > 0, "Policy: registry required");
            PolicyContractStorage storage ps = policyStorage();
            uint256 policyId = ps.policyCount;
            Policy storage policy = ps.policies[policyId];
            policy.opType = opType;
            policy.status = true;
            policy.policyName = policyName;
            policy.registry = registry;
            // add to search index
            ps.policyNameToPolicyIds[policyName].push(policyId);
            ps.registryNameToPolicyIds[registry].push(policyId);
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
                policy.policyConditions[i] = policyConditions[i];
                policy.policyConditionsCount++;
                emit PolicyConditionInserted(
                    i,
                    policyConditions[i].attributeName,
                    policyConditions[i].value
                );
            }
            ps.policyCount++;
            emit PolicyInserted(policyId, policyName, registry);
        }
    }

    /**
     * @dev add a new policy's attribute
     */
    function addPolicyConditions(
        uint256 policyId,
        PolicyCondition[] calldata policyConditions
    ) external onlyRole(OPERATOR_ROLE) {
        PolicyContractStorage storage ps = policyStorage();

        require(ps.policyCount > policyId, "Policy: invalid policy Id");
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
            emit PolicyConditionInserted(
                i,
                policyConditions[i].attributeName,
                policyConditions[i].value
            );
        }
    }

    function deletePolicyCondition(uint256 policyId, uint256 policyConditionId)
        external
        onlyRole(OPERATOR_ROLE)
    {
        PolicyContractStorage storage ps = policyStorage();
        require(ps.policyCount > policyId, "Policy: invalid policy Id");
        Policy storage policy = ps.policies[policyId];
        require(policy.status, "Policy: policy does not exist or inactive");
        require(
            policy.policyConditionsCount > policyConditionId,
            "Policy: invalid condition"
        );

        PolicyCondition memory pc = policy.policyConditions[policyConditionId];
        policy.policyConditions[policyConditionId] = policy.policyConditions[
            policy.policyConditionsCount - 1
        ];

        bytes memory zeroBytes;
        policy.policyConditions[
            policy.policyConditionsCount - 1
        ] = PolicyCondition(
            "",
            "",
            TYPE.TYPE_BYTES32,
            zeroBytes,
            OPERATION.EQUAL
        );

        policy.policyConditionsCount--;
        emit PolicyConditionDeleted(
            policyConditionId,
            pc.attributeName,
            pc.value
        );
    }

    function updatePolicy(
        uint256 policyId,
        OPERATION_TYPE opType,
        string calldata policyName,
        string calldata registry
    ) external onlyRole(OPERATOR_ROLE) {
        PolicyContractStorage storage ps = policyStorage();
        require(policyId < ps.policyCount, "Policy: invalid policy Id");
        Policy storage policy = ps.policies[policyId];
        require(policy.status, "Policy: policy does not exist or inactive");
        string memory oldPolicyName = policy.policyName;
        string memory oldRegistryName = policy.registry;
        policy.opType = opType;
        policy.policyName = policyName;
        policy.registry = registry;
        // update search index
        if (
            keccak256(abi.encodePacked(policyName)) !=
            keccak256(abi.encodePacked(oldPolicyName))
        ) {
            // update index for policyName
            for (
                uint256 i;
                i < ps.policyNameToPolicyIds[oldPolicyName].length;
                i++
            ) {
                if (ps.policyNameToPolicyIds[oldPolicyName][i] == policyId) {
                    ps.policyNameToPolicyIds[oldPolicyName][i] = ps
                        .policyNameToPolicyIds[oldPolicyName][
                            ps.policyNameToPolicyIds[oldPolicyName].length - 1
                        ];
                    ps.policyNameToPolicyIds[oldPolicyName].pop();
                    // move to the new policy Name index
                    ps.policyNameToPolicyIds[policyName].push(policyId);
                    break;
                }
            }
        }
        if (
            keccak256(abi.encodePacked(registry)) !=
            keccak256(abi.encodePacked(oldRegistryName))
        ) {
            // update index for registry
            for (
                uint256 i;
                i < ps.registryNameToPolicyIds[oldRegistryName].length;
                i++
            ) {
                if (
                    ps.registryNameToPolicyIds[oldRegistryName][i] == policyId
                ) {
                    ps.registryNameToPolicyIds[oldRegistryName][i] = ps
                        .registryNameToPolicyIds[oldRegistryName][
                            ps.registryNameToPolicyIds[oldRegistryName].length -
                                1
                        ];
                    ps.registryNameToPolicyIds[oldRegistryName].pop();
                    // move to the new policy Name index
                    ps.registryNameToPolicyIds[registry].push(policyId);
                    break;
                }
            }
        }
        emit PolicyUpdated(
            policyId,
            oldPolicyName,
            policyName,
            oldRegistryName,
            registry
        );
    }

    function deactivatePolicy(uint256 policyId)
        external
        onlyRole(OPERATOR_ROLE)
    {
        PolicyContractStorage storage ps = policyStorage();
        require(policyId < ps.policyCount, "Policy: invalid policy Id");
        Policy storage policy = ps.policies[policyId];
        require(policy.status, "Policy: invalid policy");
        policy.status = false;
        emit PolicyDeactivated(policyId);
    }

    function activatePolicy(uint256 policyId) external onlyRole(OPERATOR_ROLE) {
        PolicyContractStorage storage ps = policyStorage();
        require(policyId < ps.policyCount, "Policy: invalid policy Id");
        Policy storage policy = ps.policies[policyId];
        require(
            policy.status == false && ps.policyCount > policyId,
            "Policy: invalid policy"
        );
        policy.status = true;
        emit PolicyActivated(policyId);
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
        return ps.policyCount.paginate(page, pageSize);
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

        require(ps.policyCount > _policyId, "Policy: invalid policy");
        Policy storage policy = ps.policies[_policyId];
        registry = policy.registry;
        policyId = _policyId;
        policyName = policy.policyName;
        opType = policy.opType;
        status = policy.status;
        PolicyCondition[] memory policyConditions = new PolicyCondition[](
            policy.policyConditionsCount
        );
        for (uint256 i; i < policy.policyConditionsCount; i++) {
            policyConditions[i] = policy.policyConditions[i];
        }
        return (
            policyId,
            registry,
            policyName,
            opType,
            status,
            policyConditions
        );
    }

    function searchPolicy(string calldata searchString)
        external
        view
        returns (uint256[] memory byPolicyName, uint256[] memory byRegistryName)
    {
        PolicyContractStorage storage ps = policyStorage();
        byPolicyName = ps.policyNameToPolicyIds[searchString];
        byRegistryName = ps.registryNameToPolicyIds[searchString];
    }
}
