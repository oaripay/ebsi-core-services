// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "../bootstrap-ethereum-sc/contracts/utils/Pagination.sol";
import "./SmartContractStorage.sol";

library SmartContractLib {
    using Pagination for bytes32[];
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
    function insertSmartContractInfo(
        SmartContractStorage.SmartContracts storage ts,
        string memory name,
        bytes memory info
    ) external returns (bytes32 smartContractInfoId) {
        require(
            ts.trustedPolicyRegistry.checkPolicy(
                "TLSCR:insertSmartContractInfo",
                msg.sender
            ),
            "Policy error: sender doesn't have the attribute TLSCR:insertSmartContractInfo"
        );
        require(bytes(name).length > 0, "name empty");
        require(info.length > 0, "info empty");

        require(
            ts.scNameToSCInfoId[name] == bytes32(0),
            "name already registered"
        );

        smartContractInfoId = sha256(info);
        require(
            keccak256(ts.scInfoStore[smartContractInfoId]) ==
                keccak256(bytes("")),
            "info already registered"
        );
        ts.scInfoIdList.push(smartContractInfoId);
        ts.scNameToSCInfoId[name] = smartContractInfoId;
        // SmartContract info revision id = SHA2-256 of the SmartContractInfo bytes
        // so it is the same as SmartContract info Id
        ts.scInfoRevIdToSCInfoId[smartContractInfoId] = smartContractInfoId;
        ts.scStore[smartContractInfoId].push(smartContractInfoId);
        ts.scInfoStore[smartContractInfoId] = info;

        emit SmartContractInfoInserted(name, smartContractInfoId, name, info);
    }

    /**
     * @dev updateSmartContractInfoById enables to update existing SmartContract info by SmartContract info id.
     */
    function updateSmartContractInfoById(
        SmartContractStorage.SmartContracts storage ts,
        bytes32 smartContractInfoId,
        bytes memory info
    ) external returns (bytes32 smartContractInfoRevisionId) {
        require(
            ts.trustedPolicyRegistry.checkPolicy(
                "TLSCR:updateSmartContractInfoById",
                msg.sender
            ),
            "Policy error: sender doesn't have the attribute TLSCR:updateSmartContractInfoById"
        );
        require(smartContractInfoId != bytes32(0), "smartContractInfoId empty");
        require(info.length > 0, "info empty");

        require(
            ts.scInfoStore[smartContractInfoId].length > 0,
            "smartContract unknown"
        );

        smartContractInfoRevisionId = sha256(info);
        ts.scInfoRevIdToSCInfoId[
            smartContractInfoRevisionId
        ] = smartContractInfoId;
        ts.scStore[smartContractInfoId].push(smartContractInfoRevisionId);
        ts.scInfoStore[smartContractInfoRevisionId] = info;

        emit SmartContractInfoUpdated(
            smartContractInfoId,
            smartContractInfoRevisionId,
            info
        );
    }

    /**
     * @dev updateSmartContractInfoByName enables to update existing SmartContract info by the SmartContract name.
     */
    function updateSmartContractInfoByName(
        SmartContractStorage.SmartContracts storage ts,
        string memory name,
        bytes memory info
    ) external returns (bytes32 smartContractInfoRevisionId) {
        require(
            ts.trustedPolicyRegistry.checkPolicy(
                "TLSCR:updateSmartContractInfoByName",
                msg.sender
            ),
            "Policy error: sender doesn't have the attribute TLSCR:updateSmartContractInfoByName"
        );
        require(bytes(name).length > 0, "name empty");
        require(info.length > 0, "info empty");
        bytes32 smartContractInfoId = ts.scNameToSCInfoId[name];
        require(smartContractInfoId != bytes32(0), "smartContract unknown");

        smartContractInfoRevisionId = sha256(info);
        ts.scInfoRevIdToSCInfoId[
            smartContractInfoRevisionId
        ] = smartContractInfoId;
        ts.scStore[smartContractInfoId].push(smartContractInfoRevisionId);
        ts.scInfoStore[smartContractInfoRevisionId] = info;

        emit SmartContractInfoUpdated(
            smartContractInfoId,
            smartContractInfoRevisionId,
            info
        );
    }

    /**
     * @dev updateSmartContractName enables to update an existing smartContract name.
     */
    function updateSmartContractName(
        SmartContractStorage.SmartContracts storage ts,
        string memory oldName,
        string memory newName
    ) external {
        require(
            ts.trustedPolicyRegistry.checkPolicy(
                "TLSCR:updateSmartContractName",
                msg.sender
            ),
            "Policy error: sender doesn't have the attribute TLSCR:updateSmartContractName"
        );
        require(bytes(oldName).length > 0, "oldName empty");
        require(bytes(newName).length > 0, "newName empty");

        require(ts.scNameToSCInfoId[newName] == bytes32(0), "new name exists");
        bytes32 smartContractInfoId = ts.scNameToSCInfoId[oldName];
        require(smartContractInfoId != bytes32(0), "smartContract unknown");

        ts.scNameToSCInfoId[newName] = smartContractInfoId;

        emit SmartContractNameUpdated(oldName, newName, oldName, newName);
    }

    /**
     * @dev getSmartContractInfoIds enables to retrieve a paginated list of the registered smartContract info ids.
     */
    function getSmartContractInfoIds(
        SmartContractStorage.SmartContracts storage ts,
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
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");
        return ts.scInfoIdList.paginate(page, pageSize);
    }

    /**
     * @dev getLatestSmartContractInfoById enables to retrieve the latest smartContract
     * info revision by the smartContract id.
     */
    function getLatestSmartContractInfoById(
        SmartContractStorage.SmartContracts storage ts,
        bytes32 smartContractInfoId
    ) external view returns (bytes memory info) {
        require(smartContractInfoId != bytes32(0), "smartContractInfoId empty");
        require(
            ts.scStore[smartContractInfoId].length > 0,
            "smartContractInfoId unknown"
        );
        bytes32 smartContractInfoLastRevisionId = ts.scStore[
            smartContractInfoId
        ][ts.scStore[smartContractInfoId].length - 1];
        info = ts.scInfoStore[smartContractInfoLastRevisionId];
    }

    /**
     * @dev getLatestSmartContractInfoByName enables to retrieve the latest smartContract
     * info revision by the smartContract name.
     */
    function getLatestSmartContractInfoByName(
        SmartContractStorage.SmartContracts storage ts,
        string memory name
    ) external view returns (bytes memory info) {
        require(bytes(name).length > 0, "name empty");
        bytes32 smartContractInfoId = ts.scNameToSCInfoId[name];
        require(smartContractInfoId != bytes32(0), "smartContract unknown");

        bytes32 smartContractInfoLastRevisionId = ts.scStore[
            smartContractInfoId
        ][ts.scStore[smartContractInfoId].length - 1];
        info = ts.scInfoStore[smartContractInfoLastRevisionId];
    }

    /**
     * @dev getSmartContractInfoIdByName enables to retrieve the smart contract info Id by name.
     */
    function getSmartContractInfoIdByName(
        SmartContractStorage.SmartContracts storage ts,
        string memory name
    ) external view returns (bytes32 smartContractInfoId) {
        require(bytes(name).length > 0, "name empty");
        smartContractInfoId = ts.scNameToSCInfoId[name];
        require(smartContractInfoId != bytes32(0), "smartContract unknown");
    }

    /**
     * @dev getSmartContractInfoByRevisionId enables to retrieve a smartContract info revision.
     */
    function getSmartContractInfoByRevisionId(
        SmartContractStorage.SmartContracts storage ts,
        bytes32 smartContractInfoRevisionId
    ) external view returns (bytes memory info) {
        require(
            smartContractInfoRevisionId != bytes32(0),
            "smartContractInfoRevisionId empty"
        );
        info = ts.scInfoStore[smartContractInfoRevisionId];
    }

    /**
     * @dev getSmartContractInfoRevisionIds enables to retrieve a paginated list of
     * smartContract info revision ids by any revision id.
     */
    function getSmartContractInfoRevisionIds(
        SmartContractStorage.SmartContracts storage ts,
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
        require(smartContractInfoId != bytes32(0), "smartContractInfoId empty");
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");
        return ts.scStore[smartContractInfoId].paginate(page, pageSize);
    }
}
