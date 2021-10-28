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
        string calldata policyName
    ) external {
        require(bytes(policyName).length > 0, "Policy: name required");
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
        }
        PolicyContractStorage storage ps = policyStorage();
        uint256 policyId = ps.lastPolicyId + 1;
        ps.lastPolicyId = policyId;
        Policy storage policy = ps.policies[policyId];
        policy.opType = opType;
        policy.policyName = policyName;
        for (uint256 i = 0; i < policyConditions.length; i++) {
            policy.policyConditions[i] = policyConditions[i];
        }
    }

    /**
     * @dev add a new policy's attribute
     */
    function updatePolicy(string calldata policyId, bytes calldata policyData)
        external
    {}

    uint256[50] private ______gap;
}
