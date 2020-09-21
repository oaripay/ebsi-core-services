// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../utils/upgradeability/Initializable.sol";
import "./PolicyStorage.sol";
import "../utils/math/SafeMath.sol";

abstract contract PolicyDetailed is PolicyStorage {
    using SafeMath for uint256;

    event addNewPolicy(string indexed policyId, bytes policy);
    event updateExistingPolicy(string indexed policyId, bytes policy);

    /**
     * @dev insert an Policy
     */
    function insertPolicy(string calldata policyId, bytes calldata policyData)
        external
    {
        PolicyModel storage ds = policyStorage();
        require(ds.policies[policyId].length == 0, "policy is already stored");
        ds.policies[policyId] = policyData;

        // push the policy ID
        ds.policyIDs.push(policyId);

        emit addNewPolicy(policyId, policyData);
    }

    /**
     * @dev add a new policy's attribute
     */
    function updatePolicy(string calldata policyId, bytes calldata policyData)
        external
    {
        PolicyModel storage ds = policyStorage();

        require(
            ds.policies[policyId].length > 0,
            "policy is new call insertPolicy instead"
        );
        ds.policies[policyId] = policyData;
        emit updateExistingPolicy(policyId, policyData);
    }

    function getPolicy(string memory policyId)
        public
        view
        returns (bytes memory)
    {
        PolicyModel storage ds = policyStorage();
        return ds.policies[policyId];
    }

    /* {
      "items": [policyA, policyB],
      "total": 30,
      "pageSize": 2,
      "prev": 3,
      "next": 5
    } */
    function getPolicies(uint256 page, uint256 howMany)
        public
        view
        returns (
            string[] memory items,
            uint256 total,
            uint256 pageSize,
            uint256 prev,
            uint256 next
        )
    {
        require(howMany <= 50, "PageSize should not be greater than 50");
        require(howMany > 0, "PageSize should be greater than 0");
        PolicyModel storage ds = policyStorage();
        total = ds.policyIDs.length;
        pageSize = howMany;
        uint256 length = howMany;
        uint256 cursor = page;
        if (cursor == 0) {
            if (total >= howMany) {
                length = howMany;
                prev = 0;
                next = 1;
            } else {
                length = total;
                pageSize = total;
                prev = 0;
                next = 0;
            }
        } else {
            if (total > page.add(1).mul(howMany)) {
                length = howMany;
                cursor = page.mul(howMany);
                prev = page.sub(1);
                next = page.add(1);
            } else {
                if (howMany >= total) {
                    length = total;
                    pageSize = total;
                    page = 0;
                    cursor = 0;
                    prev = 0;
                    next = 0;
                } else {
                    length = total.mod(howMany);
                    page = total.div(howMany);
                    cursor = page.mul(howMany);
                    prev = page.sub(1);
                    next = page;
                }
            }
        }

        items = new string[](length);
        for (uint256 i = 0; i < length; i++) {
            items[i] = ds.policyIDs[cursor.add(i)];
        }

        return (items, total, pageSize, prev, next);
    }

    uint256[50] private ______gap;
}
