// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "@ebsiint-sc/bootstrap/contracts/utils/Pagination.sol";
import "./LedgerStorage.sol";

library LedgerLib {
    using Pagination for bytes32[];
    event LedgerInfoInserted(
        string indexed nameIndexed,
        bytes32 indexed ledgerInfoId,
        string name,
        bytes ledgerInfo
    );

    event LedgerInfoUpdated(
        bytes32 indexed ledgerInfoId,
        bytes32 indexed ledgerInfoRevisionId,
        bytes newLedgerInfo
    );
    event LedgerNameUpdated(
        string indexed oldNameIndexed,
        string indexed newNameIndexed,
        string oldName,
        string newName
    );

    /**
     * @dev insertLedgerInfo enables to register Ledger information
     * (see the data model above) as a signed and serialized JSON-LD
     * document.
     */
    function insertLedgerInfo(
        LedgerStorage.Ledgers storage ts,
        string memory name,
        bytes memory info
    ) external returns (bytes32 ledgerInfoId) {
        require(
            ts.trustedPolicyRegistry.checkPolicy(
                "TLSCR:insertLedgerInfo",
                msg.sender
            ),
            "Policy error: sender doesn't have the attribute TLSCR:insertLedgerInfo"
        );
        require(bytes(name).length > 0, "name empty");
        require(info.length > 0, "info empty");

        require(
            ts.ledgerNameToLedgerInfoId[name] == bytes32(0),
            "name already registered"
        );

        ledgerInfoId = sha256(info);

        require(
            keccak256(ts.ledgerInfoStore[ledgerInfoId]) == keccak256(bytes("")),
            "info already registered"
        );
        ts.ledgerInfoIdList.push(ledgerInfoId);
        ts.ledgerNameToLedgerInfoId[name] = ledgerInfoId;
        // Ledger info revision id = SHA2-256 of the LedgerInfo bytes so it is the same as Ledger info Id
        ts.ledgerInfoRevIdToLedgerInfoId[ledgerInfoId] = ledgerInfoId;
        ts.ledgerStore[ledgerInfoId].push(ledgerInfoId);
        ts.ledgerInfoStore[ledgerInfoId] = info;

        emit LedgerInfoInserted(name, ledgerInfoId, name, info);
    }

    /**
     * @dev updateLedgerInfoById enables to update existing Ledger info by Ledger info id.
     */
    function updateLedgerInfoById(
        LedgerStorage.Ledgers storage ts,
        bytes32 ledgerInfoId,
        bytes memory info
    ) external returns (bytes32 ledgerInfoRevisionId) {
        require(
            ts.trustedPolicyRegistry.checkPolicy(
                "TLSCR:updateLedgerInfoById",
                msg.sender
            ),
            "Policy error: sender doesn't have the attribute TLSCR:updateLedgerInfoById"
        );
        require(ledgerInfoId != bytes32(0), "ledgerInfoId empty");
        require(info.length > 0, "info empty");

        require(ts.ledgerInfoStore[ledgerInfoId].length > 0, "ledger unknown");

        ledgerInfoRevisionId = sha256(info);
        ts.ledgerInfoRevIdToLedgerInfoId[ledgerInfoRevisionId] = ledgerInfoId;
        ts.ledgerStore[ledgerInfoId].push(ledgerInfoRevisionId);
        ts.ledgerInfoStore[ledgerInfoRevisionId] = info;

        emit LedgerInfoUpdated(ledgerInfoId, ledgerInfoRevisionId, info);
    }

    /**
     * @dev updateLedgerInfoByName enables to update existing Ledger info by the Ledger name.
     */
    function updateLedgerInfoByName(
        LedgerStorage.Ledgers storage ts,
        string memory name,
        bytes memory info
    ) external returns (bytes32 ledgerInfoRevisionId) {
        require(
            ts.trustedPolicyRegistry.checkPolicy(
                "TLSCR:updateLedgerInfoByName",
                msg.sender
            ),
            "Policy error: sender doesn't have the attribute TLSCR:updateLedgerInfoByName"
        );
        require(bytes(name).length > 0, "name empty");
        require(info.length > 0, "info empty");
        bytes32 ledgerInfoId = ts.ledgerNameToLedgerInfoId[name];
        require(ledgerInfoId != bytes32(0), "ledger unknown");

        ledgerInfoRevisionId = sha256(info);
        ts.ledgerInfoRevIdToLedgerInfoId[ledgerInfoRevisionId] = ledgerInfoId;
        ts.ledgerStore[ledgerInfoId].push(ledgerInfoRevisionId);
        ts.ledgerInfoStore[ledgerInfoRevisionId] = info;

        emit LedgerInfoUpdated(ledgerInfoId, ledgerInfoRevisionId, info);
    }

    /**
     * @dev updateLedgerName enables to update an existing ledger name.
     */
    function updateLedgerName(
        LedgerStorage.Ledgers storage ts,
        string memory oldName,
        string memory newName
    ) external {
        require(
            ts.trustedPolicyRegistry.checkPolicy(
                "TLSCR:updateLedgerName",
                msg.sender
            ),
            "Policy error: sender doesn't have the attribute TLSCR:updateLedgerName"
        );
        require(bytes(oldName).length > 0, "oldName empty");
        require(bytes(newName).length > 0, "newName empty");

        require(
            ts.ledgerNameToLedgerInfoId[newName] == bytes32(0),
            "new name exists"
        );
        bytes32 ledgerInfoId = ts.ledgerNameToLedgerInfoId[oldName];
        require(ledgerInfoId != bytes32(0), "ledger unknown");

        ts.ledgerNameToLedgerInfoId[newName] = ledgerInfoId;

        emit LedgerNameUpdated(oldName, newName, oldName, newName);
    }

    /**
     * @dev getLedgerInfoIds enables to retrieve a paginated list of the registered ledger info ids.
     */
    function getLedgerInfoIds(
        LedgerStorage.Ledgers storage ts,
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
        return ts.ledgerInfoIdList.paginate(page, pageSize);
    }

    /**
     * @dev getLatestLedgerInfoById enables to retrieve the latest ledger info revision by the ledger id.
     */
    function getLatestLedgerInfoById(
        LedgerStorage.Ledgers storage ts,
        bytes32 ledgerInfoId
    ) external view returns (bytes memory info) {
        require(ledgerInfoId != bytes32(0), "ledgerInfoId empty");
        require(
            ts.ledgerStore[ledgerInfoId].length > 0,
            "ledgerInfoId unknown"
        );

        bytes32 ledgerInfoLastRevisionId = ts.ledgerStore[ledgerInfoId][
            ts.ledgerStore[ledgerInfoId].length - 1
        ];
        info = ts.ledgerInfoStore[ledgerInfoLastRevisionId];
    }

    /**
     * @dev getLatestLedgerInfoByName enables to retrieve the latest ledger info revision by the ledger name.
     */
    function getLatestLedgerInfoByName(
        LedgerStorage.Ledgers storage ts,
        string memory name
    ) external view returns (bytes memory info) {
        require(bytes(name).length > 0, "name empty");
        bytes32 ledgerInfoId = ts.ledgerNameToLedgerInfoId[name];
        require(ledgerInfoId != bytes32(0), "ledger unknown");
        require(ts.ledgerStore[ledgerInfoId].length > 0, "ledger unknown");

        bytes32 ledgerInfoLastRevisionId = ts.ledgerStore[ledgerInfoId][
            ts.ledgerStore[ledgerInfoId].length - 1
        ];
        info = ts.ledgerInfoStore[ledgerInfoLastRevisionId];
    }

    /**
     * @dev getLedgerInfoIdByName enables to retrieve the ledger info Id by the ledger name.
     */
    function getLedgerInfoIdByName(
        LedgerStorage.Ledgers storage ts,
        string memory name
    ) external view returns (bytes32 ledgerInfoId) {
        require(bytes(name).length > 0, "name empty");
        ledgerInfoId = ts.ledgerNameToLedgerInfoId[name];
        require(ledgerInfoId != bytes32(0), "ledger unknown");
        require(ts.ledgerStore[ledgerInfoId].length > 0, "ledger unknown");
    }

    /**
     * @dev getLedgerInfoByRevisionId enables to retrieve a ledger info revision.
     */
    function getLedgerInfoByRevisionId(
        LedgerStorage.Ledgers storage ts,
        bytes32 ledgerInfoRevisionId
    ) external view returns (bytes memory info) {
        require(
            ledgerInfoRevisionId != bytes32(0),
            "ledgerInfoRevisionId empty"
        );
        info = ts.ledgerInfoStore[ledgerInfoRevisionId];
    }

    /**
     * @dev getLedgerInfoRevisionIds enables to retrieve a paginated list of ledger info
     * revision ids by any revision id.
     */
    function getLedgerInfoRevisionIds(
        LedgerStorage.Ledgers storage ts,
        bytes32 ledgerInfoId,
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
        require(ledgerInfoId != bytes32(0), "ledgerInfoId empty");
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");
        return ts.ledgerStore[ledgerInfoId].paginate(page, pageSize);
    }
}
