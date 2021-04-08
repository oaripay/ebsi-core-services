// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;

import "./AdministratorStorage.sol";
import "./AdministratorLib.sol";

contract AdministratorDetailed is AdministratorStorage {
    using AdministratorLib for Administrators;
    /*
    Any event created by the library will be saved in the event log of the contract that calls the event emitting function in the library.
    As the contract ABI does not reflect the events that the libraries it uses may emit clients such as web3,
    won’t be able to decode what event was called or figure out how to decode its arguments.
    Defining the event both in the contract and the library will trick clients into thinking that it was actually the main contract who sent the event and not the library.
    cf: https://blog.gnosis.pm/solidity-delegateproxy-contracts-e09957d0f201
    */
    event AddAdministratorAttribute(
        bytes32 indexed didHash,
        bytes32 indexed firstAttrHash,
        string did,
        uint256 attributeVersionCount,
        uint256 attributesCount
    );
    event UpdateAdministratorAttribute(
        bytes32 indexed didHash,
        bytes32 indexed newAttrHash,
        bytes32 indexed previousAttrHash,
        bytes32 firstAttrHash,
        string did,
        uint256 attributeVersionCount,
        uint256 attributesCount
    );

    /**
     * @dev insert an Administrator
     */
    function insertAdministrator(
        string calldata did,
        bytes calldata attributeData
    ) external {
        Administrators storage ds = administratorStorage();
        ds.insertAdministrator(did, attributeData);
    }

    /**
     * @dev add a new administrator's attribute
     */
    function updateAdministrator(
        string calldata did,
        bytes calldata attributeData
    ) external {
        Administrators storage ds = administratorStorage();
        ds.updateAdministrator(did, attributeData);
    }

    /**
     * @dev add a new version to a administrator's attribute
     */
    function updateAdministrator(
        string calldata did,
        bytes calldata attributeData,
        bytes32 lastVersHash
    ) external {
        Administrators storage ds = administratorStorage();
        ds.updateAdministrator(did, attributeData, lastVersHash);
    }

    function getAdministrator(string memory did)
        public
        view
        returns (bytes32[] memory)
    {
        Administrators storage ds = administratorStorage();
        return ds.getAdministrator(did);
    }

    /* {
      "items": [administratorA, administratorB],
      "total": 30,
      "pageSize": 2,
      "prev": 3,
      "next": 5
    } */
    function getAdministrators(uint256 page, uint256 pageSize)
        public
        view
        returns (
            string[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        Administrators storage ds = administratorStorage();
        return ds.getAdministrators(page, pageSize);
    }

    function getAdministratorAttributeRevisions(
        bytes32 anyAttrVersHash,
        uint256 page,
        uint256 pageSize
    )
        public
        view
        returns (
            bytes32[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        Administrators storage ds = administratorStorage();

        return
            ds.getAdministratorAttributeRevisions(
                anyAttrVersHash,
                page,
                pageSize
            );
    }

    function getAdministratorAttributeByHash(bytes32 anyAttrVersHash)
        public
        view
        returns (string memory did, bytes memory attribData)
    {
        Administrators storage ds = administratorStorage();
        return ds.getAdministratorAttributeByHash(anyAttrVersHash);
    }
}
