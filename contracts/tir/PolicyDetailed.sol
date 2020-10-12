// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../utils/upgradeability/Initializable.sol";
import "./PolicyStorage.sol";
import "../utils/math/SafeMath.sol";

abstract contract PolicyDetailed is PolicyStorage {
    using SafeMath for uint256;

    event addNewPolicy(
        string indexed policyId,
        bytes32 indexed policyHash,
        bytes policy
    );
    event updateExistingPolicy(
        string indexed policyId,
        bytes32 indexed policyHash,
        bytes policy
    );

    /**
     * @dev insert an Policy
     */
    function insertPolicy(string calldata policyId, bytes calldata policyData)
        external
    {
        bytes32 firstPolicyHash = keccak256(policyData);

        Policies storage ds = policyStorage();
        PolicyDetails storage p = ds.policyStore[policyId];
        require(
            p.revisionHashes.length == 0,
            "policy already exist use updatePolicy to update a policy"
        );

        assert(ds.revisions[firstPolicyHash].length == 0);

        // store a link between this policyId to the policy to easily retrieve it
        // store the version hash and data for this policy
        p.revisionHashes.push(firstPolicyHash);
        ds.revisions[firstPolicyHash] = policyData;
        // push the policy ID
        ds.policyIdStore.push(policyId);

        emit addNewPolicy(policyId, firstPolicyHash, policyData);
    }

    /**
     * @dev add a new policy's attribute
     */
    function updatePolicy(string calldata policyId, bytes calldata policyData)
        external
    {
        Policies storage ds = policyStorage();
        PolicyDetails storage p = ds.policyStore[policyId];
        require(p.revisionHashes.length > 0, "policy does not exist");
        bytes32 newPolicyHash = keccak256(policyData);

        require(
            keccak256(bytes(ds.revisions[newPolicyHash])) ==
                keccak256(bytes("")),
            "policy data is already stored"
        );

        // store a link between this policyId to the policy to easily retrieve it
        // store the version hash and data for this attribute

        p.revisionHashes.push(newPolicyHash);
        ds.revisions[newPolicyHash] = policyData;
        emit updateExistingPolicy(policyId, newPolicyHash, policyData);
    }

    /**
    Returns the data of the last revision
     */
    function getPolicy(string memory policyId)
        public
        view
        returns (bytes memory)
    {
        Policies storage ds = policyStorage();
        bytes32[] memory policyRevisionHashes = ds.policyStore[policyId]
            .revisionHashes;
        require(policyRevisionHashes.length > 0, "policy does not exist");
        bytes32 lastHash = policyRevisionHashes[policyRevisionHashes.length -
            1];
        return ds.revisions[lastHash];
    }

    /**
    Returns the data of the provided revision
     */
    function getPolicyByHash(bytes32 revisionHash)
        public
        view
        returns (bytes memory)
    {
        Policies storage ds = policyStorage();
        require(
            keccak256(bytes(ds.revisions[revisionHash])) !=
                keccak256(bytes("")),
            "policy data does not exist"
        );

        return ds.revisions[revisionHash];
    }

    /**
    Returns all the revision hashes
     */
    function getPolicyRevisions(string calldata policyId)
        public
        view
        returns (bytes32[] memory)
    {
        Policies storage ds = policyStorage();
        PolicyDetails memory p = ds.policyStore[policyId];
        require(p.revisionHashes.length > 0, "policyId does not exist");

        return p.revisionHashes;
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
        Policies storage ds = policyStorage();
        total = ds.policyIdStore.length;
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
            items[i] = ds.policyIdStore[cursor.add(i)];
        }

        return (items, total, pageSize, prev, next);
    }

    uint256[50] private ______gap;
}
