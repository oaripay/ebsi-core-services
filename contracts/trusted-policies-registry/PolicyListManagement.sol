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
        string description
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
        string oldDescription,
        string newDescription
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
        string calldata description
    ) external onlyRole(OPERATOR_ROLE) {
        {
            // to make sure not going into stack too deep
            require(bytes(policyName).length > 0, "Policy: name required");
            require(
                bytes(description).length > 0,
                "Policy: description required"
            );
            PolicyContractStorage storage ps = policyStorage();
            // check if the policy already exists
            require(
                ps.policyNameDefined[policyName] == false,
                "Policy: policy exists"
            );
            uint256 policyId = ps.policyCount;
            Policy storage policy = ps.policies[policyId];
            policy.opType = opType;
            policy.status = true;
            policy.policyName = policyName;
            policy.description = description;
            // add to search index
            ps.policyNameToPolicyId[policyName] = policyId;
            ps.policyNameDefined[policyName] = true;
            ps.descriptionToPolicyIds[description].push(policyId);
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
            emit PolicyInserted(policyId, policyName, description);
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
        string calldata description
    ) external onlyRole(OPERATOR_ROLE) {
        PolicyContractStorage storage ps = policyStorage();
        require(policyId < ps.policyCount, "Policy: invalid policy Id");
        Policy storage policy = ps.policies[policyId];
        require(policy.status, "Policy: policy does not exist or inactive");
        string memory oldPolicyName = policy.policyName;
        string memory oldDescription = policy.description;
        policy.opType = opType;
        policy.policyName = policyName;
        policy.description = description;
        // update search index
        if (
            keccak256(abi.encodePacked(policyName)) !=
            keccak256(abi.encodePacked(oldPolicyName))
        ) {
            // update index for policyName
            require(
                ps.policyNameDefined[policyName] == false,
                "Policy Name already exists"
            );
            ps.policyNameDefined[oldPolicyName] = false;
            ps.policyNameToPolicyId[oldPolicyName] = 0;
            ps.policyNameToPolicyId[policyName] = policyId;
            ps.policyNameDefined[policyName] = true;
        }
        if (
            keccak256(abi.encodePacked(description)) !=
            keccak256(abi.encodePacked(oldDescription))
        ) {
            // update index for registry
            for (
                uint256 i;
                i < ps.descriptionToPolicyIds[oldDescription].length;
                i++
            ) {
                if (ps.descriptionToPolicyIds[oldDescription][i] == policyId) {
                    ps.descriptionToPolicyIds[oldDescription][i] = ps
                        .descriptionToPolicyIds[oldDescription][
                            ps.descriptionToPolicyIds[oldDescription].length - 1
                        ];
                    ps.descriptionToPolicyIds[oldDescription].pop();
                    // move to the new policy Name index
                    ps.descriptionToPolicyIds[description].push(policyId);
                    break;
                }
            }
        }
        emit PolicyUpdated(
            policyId,
            oldPolicyName,
            policyName,
            oldDescription,
            description
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

    function getPolicyNames(uint256 page, uint256 pageSize)
        external
        view
        returns (
            string[] memory items,
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
        uint256[] memory itemsUint;
        (itemsUint, total, howMany, prev, next) = ps.policyCount.paginate(
            page,
            pageSize
        );
        string[] memory itemsStrings = new string[](itemsUint.length);

        for (uint256 i; i < itemsUint.length; i++) {
            itemsStrings[i] = ps.policies[itemsUint[i]].policyName;
        }
        return (itemsStrings, total, howMany, prev, next);
    }

    function getPolicy(uint256 _policyId)
        external
        view
        returns (
            uint256 policyId,
            string memory description,
            string memory policyName,
            OPERATION_TYPE opType,
            bool status,
            PolicyCondition[] memory policyConditions
        )
    {
        return _getPolicy(_policyId);
    }

    function getPolicy(string calldata _policyName)
        external
        view
        returns (
            uint256 policyId,
            string memory description,
            string memory policyName,
            OPERATION_TYPE opType,
            bool status,
            PolicyCondition[] memory policyConditions
        )
    {
        PolicyContractStorage storage ps = policyStorage();
        require(ps.policyNameDefined[_policyName], "policy does not exists");
        return _getPolicy(ps.policyNameToPolicyId[_policyName]);
    }

    function _getPolicy(uint256 _policyId)
        internal
        view
        returns (
            uint256 policyId,
            string memory description,
            string memory policyName,
            OPERATION_TYPE opType,
            bool status,
            PolicyCondition[] memory policyConditions
        )
    {
        PolicyContractStorage storage ps = policyStorage();

        require(ps.policyCount > _policyId, "Policy: invalid policy");
        Policy storage policy = ps.policies[_policyId];
        description = policy.description;
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
            description,
            policyName,
            opType,
            status,
            policyConditions
        );
    }

    function searchPolicy(string calldata searchString)
        external
        view
        returns (uint256[] memory byPolicyName, uint256[] memory byDescription)
    {
        PolicyContractStorage storage ps = policyStorage();
        uint256 length;
        if (ps.policyNameDefined[searchString]) {
            length = 1;
        }
        uint256[] memory policyArr = new uint256[](length);
        if (ps.policyNameDefined[searchString]) {
            policyArr[0] = ps.policyNameToPolicyId[searchString];
        }
        byDescription = ps.descriptionToPolicyIds[searchString];
        return (policyArr, byDescription);
    }
}
