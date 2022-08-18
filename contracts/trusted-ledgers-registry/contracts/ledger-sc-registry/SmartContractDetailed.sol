// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "./SmartContractStorage.sol";
import "./SmartContractLib.sol";

contract SmartContractDetailed is SmartContractStorage {
    using SmartContractLib for SmartContracts;

    event SmartContractInfoInserted(
        string indexed nameIndexed,
        bytes32 indexed smartContractInfoId,
        string name,
        bytes smartContractInfo
    );

    event SmartContractInfoUpdated(
        bytes32 indexed smartContractInfoId,
        bytes32 indexed smartContractInfoRevisionId,
        bytes smartContractInfo
    );
    event SmartContractNameUpdated(
        string indexed oldNameIndexed,
        string indexed newNameIndexed,
        string oldName,
        string newName
    );

    /**
     * @dev insertSmartContractInfo enables to register SmartContract information
     * (see the data model above) as a signed and serialized JSON-LD document.
     */
    function insertSmartContractInfo(string memory name, bytes memory info)
        external
        returns (bytes32 smartContractInfoId)
    {
        SmartContracts storage ts = smartContractStorage();
        return ts.insertSmartContractInfo(name, info);
    }

    /**
     * @dev updateSmartContractInfoById enables to update existing SmartContract info by SmartContract info id.
     */
    function updateSmartContractInfoById(
        bytes32 smartContractInfoId,
        bytes memory info
    ) external returns (bytes32 smartContractInfoRevisionId) {
        SmartContracts storage ts = smartContractStorage();
        return ts.updateSmartContractInfoById(smartContractInfoId, info);
    }

    /**
     * @dev updateSmartContractInfoByName enables to update existing SmartContract info by the SmartContract name.
     */
    function updateSmartContractInfoByName(
        string memory name,
        bytes memory info
    ) external returns (bytes32 smartContractInfoRevisionId) {
        SmartContracts storage ts = smartContractStorage();
        return ts.updateSmartContractInfoByName(name, info);
    }

    /**
     * @dev updateSmartContractName enables to update an existing smartContract name.
     */
    function updateSmartContractName(
        string memory oldName,
        string memory newName
    ) external {
        SmartContracts storage ts = smartContractStorage();
        ts.updateSmartContractName(oldName, newName);
    }

    /**
     * @dev getSmartContractInfoIds enables to retrieve a paginated list of the registered smartContract info ids.
     */
    function getSmartContractInfoIds(uint256 page, uint256 pageSize)
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
        SmartContracts storage ts = smartContractStorage();
        return ts.getSmartContractInfoIds(page, pageSize);
    }

    /**
     * @dev getLatestSmartContractInfoById enables to retrieve the latest smartContract
     * info revision by the smartContract id.
     */
    function getLatestSmartContractInfoById(bytes32 smartContractInfoId)
        external
        view
        returns (bytes memory info)
    {
        SmartContracts storage ts = smartContractStorage();
        return ts.getLatestSmartContractInfoById(smartContractInfoId);
    }

    /**
     * @dev getLatestSmartContractInfoByName enables to retrieve the latest smartContract
     * info revision by the smartContract name.
     */
    function getLatestSmartContractInfoByName(string memory name)
        external
        view
        returns (bytes memory info)
    {
        SmartContracts storage ts = smartContractStorage();
        return ts.getLatestSmartContractInfoByName(name);
    }

    /**
     * @dev getSmartContractInfoIdByName enables to retrieve the smart contract info Id by name.
     */
    function getSmartContractInfoIdByName(string memory name)
        external
        view
        returns (bytes32)
    {
        SmartContracts storage ts = smartContractStorage();
        return ts.getSmartContractInfoIdByName(name);
    }

    /**
     * @dev getSmartContractInfoByRevisionId enables to retrieve a smartContract info revision.
     */
    function getSmartContractInfoByRevisionId(
        bytes32 smartContractInfoRevisionId
    ) external view returns (bytes memory info) {
        SmartContracts storage ts = smartContractStorage();
        return ts.getSmartContractInfoByRevisionId(smartContractInfoRevisionId);
    }

    /**
     * @dev getSmartContractInfoRevisionIds enables to retrieve a paginated list of
     * smartContract info revision ids by any revision id.
     */
    function getSmartContractInfoRevisionIds(
        bytes32 smartContractInfoId,
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
        SmartContracts storage ts = smartContractStorage();
        return
            ts.getSmartContractInfoRevisionIds(
                smartContractInfoId,
                page,
                pageSize
            );
    }
}
