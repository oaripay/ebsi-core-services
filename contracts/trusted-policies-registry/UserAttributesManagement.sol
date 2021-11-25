// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.9;
pragma experimental ABIEncoderV2;

import "./PolicyStorage.sol";
import "../bootstrap-ethereum-sc/contracts/utils/Pagination.sol";
import "./utils/Strings.sol";

abstract contract UserAttributesManagement is PolicyStorage {
    using Pagination for address[];
    using Pagination for string[];

    event UserAttributeInserted(address user, string attribute, bytes value);
    event UserAttributeUpdated(address user, string attribute, bytes value);
    event UserAttributeDeleted(address user, string attribute);

    // insert user attributes

    function insertUserAttributes(
        address user,
        string[] calldata attributes,
        bytes[] calldata values
    ) external {
        PolicyContractStorage storage ps = policyStorage();
        require(attributes.length > 0, "Policy: invalid attr list");
        require(
            attributes.length == values.length,
            "Policy: invalid attr length"
        );
        for (uint256 i; i < attributes.length; i++) {
            require(
                ps.userAttributes[user][attributes[i]].length == 0,
                "Attribute already defined"
            );
            ps.userAttributes[user][attributes[i]] = values[i];
            ps.listOfUserAttributes[user].push(attributes[i]);
            emit UserAttributeInserted(user, attributes[i], values[i]);
        }
        if (!ps.userAddressExists[user]) {
            ps.addresses.push(user);
            ps.userAddressExists[user] = true;
        }
    }

    function updateUserAttribute(
        address user,
        string calldata attribute,
        bytes calldata value
    ) external {
        PolicyContractStorage storage ps = policyStorage();
        require(value.length > 0, "Policy: invalid value");
        require(
            ps.userAttributes[user][attribute].length > 0,
            "Policy: attr invalid"
        );
        ps.userAttributes[user][attribute] = value;
        emit UserAttributeUpdated(user, attribute, value);
    }

    function deleteUserAttribute(address user, string calldata attribute)
        external
    {
        PolicyContractStorage storage ps = policyStorage();
        require(
            ps.userAttributes[user][attribute].length > 0,
            "Policy: attr invalid"
        );

        ps.userAttributes[user][attribute] = new bytes(0);
        uint256 length = ps.listOfUserAttributes[user].length;

        for (uint256 i; i < length; i++) {
            if (
                keccak256(abi.encodePacked(ps.listOfUserAttributes[user][i])) ==
                keccak256(abi.encodePacked(attribute))
            ) {
                // insert in the position i the last element of the array
                ps.listOfUserAttributes[user][i] = ps.listOfUserAttributes[
                    user
                ][length - 1];
                // delete last element from the array
                ps.listOfUserAttributes[user].pop();
                emit UserAttributeDeleted(user, attribute);
                break;
            }
        }
    }

    function getUsers(uint256 page, uint256 pageSize)
        external
        view
        returns (
            address[] memory items,
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
        return ps.addresses.paginate(page, pageSize);
    }

    function getUserAttributes(
        address user,
        uint256 page,
        uint256 pageSize
    )
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
        require(
            ps.listOfUserAttributes[user].length > 0,
            "Policy: invalid user"
        );
        return ps.listOfUserAttributes[user].paginate(page, pageSize);
    }

    function getUserAttribute(address user, string calldata attribute)
        external
        view
        returns (bytes memory value)
    {
        PolicyContractStorage storage ps = policyStorage();
        return ps.userAttributes[user][attribute];
    }
}
