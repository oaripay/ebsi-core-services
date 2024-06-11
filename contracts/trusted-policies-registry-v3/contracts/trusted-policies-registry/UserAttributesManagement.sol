// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./PolicyStorage.sol";
import "./Roles.sol";

abstract contract UserAttributesManagement is
    PolicyStorage,
    AccessControl,
    Roles
{
    event UserAttributeInserted(address user, string attribute);
    event UserAttributeDeleted(address user, string attribute);

    // insert user attributes

    /**
     * @dev insert user attributes (defined on a policy condition)
     * @param user address
     * @param attributes array of strings
     */

    function insertUserAttributes(
        address user,
        string[] calldata attributes
    ) external onlyRole(OPERATOR_ROLE) {
        require(user != address(0), "Policy: invalid user address");
        PolicyContractStorage storage ps = policyStorage();
        require(attributes.length > 0, "Policy: invalid attr list");
        for (uint256 i = 0; i < attributes.length; i++) {
            require(bytes(attributes[i]).length > 0, "Attribute empty");
            require(
                !ps.userAttributes[user][attributes[i]].defined,
                "Attribute already defined"
            );
            ps.userAttributes[user][attributes[i]].defined = true;
            ps.userAttributes[user][attributes[i]].index = ps
                .listOfUserAttributes[user]
                .length;
            ps.listOfUserAttributes[user].push(attributes[i]);
            emit UserAttributeInserted(user, attributes[i]);
        }
        if (!ps.userAddressExists[user]) {
            ps.addresses.push(user);
            ps.userAddressExists[user] = true;
        }
    }

    /**
     * @dev delete user attributes (defined on a policy condition)
     */

    function deleteUserAttribute(
        address user,
        string calldata attribute
    ) external onlyRole(OPERATOR_ROLE) {
        require(user != address(0), "Policy: invalid user address");
        PolicyContractStorage storage ps = policyStorage();

        uint256 length = ps.listOfUserAttributes[user].length;
        UserAttribute storage userAttributeToBeDeleted = ps.userAttributes[
            user
        ][attribute];
        require(userAttributeToBeDeleted.defined, "Policy: attr invalid");
        string memory lastAttribute = ps.listOfUserAttributes[user][length - 1];
        UserAttribute storage userAttributeInterchanged = ps.userAttributes[
            user
        ][lastAttribute];

        // set last Attribute on new index
        ps.listOfUserAttributes[user][
            userAttributeToBeDeleted.index
        ] = lastAttribute;
        // remove last Attribute
        ps.listOfUserAttributes[user].pop();
        // set the index of interchanged attribute to new index
        userAttributeInterchanged.index = userAttributeToBeDeleted.index;

        // set the index for the deleted attribute to false
        userAttributeToBeDeleted.defined = false;
        userAttributeToBeDeleted.index = 0;

        emit UserAttributeDeleted(user, attribute);
    }

    /**
     * @dev get attributes of a defined user
     */

    function getUserAttribute(
        address user,
        uint256 attributeId
    ) external view returns (string memory) {
        PolicyContractStorage storage ps = policyStorage();
        require(
            ps.listOfUserAttributes[user].length > attributeId,
            "Policy: invalid user or attribute"
        );
        return ps.listOfUserAttributes[user][attributeId];
    }

    // Reserved storage space to allow for layout changes in the future.
    uint256[50] private __gap;
}
