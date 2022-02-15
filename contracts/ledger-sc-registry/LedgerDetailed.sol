// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;

import "./LedgerStorage.sol";
import "./LedgerLib.sol";

contract LedgerDetailed is LedgerStorage {
    using LedgerLib for Ledgers;

    event LedgerInfoInserted(
        string indexed nameIndexed,
        bytes32 indexed ledgerInfoId,
        string name,
        bytes ledgerInfo
    );

    event LedgerInfoUpdated(
        bytes32 indexed ledgerInfoId,
        bytes32 indexed ledgerInfoRevisionId,
        bytes ledgerInfo
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
    function insertLedgerInfo(string memory name, bytes memory info)
        external
        returns (bytes32 ledgerInfoId)
    {
        Ledgers storage ts = ledgerStorage();
        return ts.insertLedgerInfo(name, info);
    }

    /**
     * @dev updateLedgerInfoById enables to update existing Ledger info by Ledger info id.
     */
    function updateLedgerInfoById(bytes32 ledgerInfoId, bytes memory info)
        external
        returns (bytes32 ledgerInfoRevisionId)
    {
        Ledgers storage ts = ledgerStorage();
        return ts.updateLedgerInfoById(ledgerInfoId, info);
    }

    /**
     * @dev updateLedgerInfoByName enables to update existing Ledger info by the Ledger name.
     */
    function updateLedgerInfoByName(string memory name, bytes memory info)
        external
        returns (bytes32 ledgerInfoRevisionId)
    {
        Ledgers storage ts = ledgerStorage();
        return ts.updateLedgerInfoByName(name, info);
    }

    /**
     * @dev updateLedgerName enables to update an existing ledger name.
     */
    function updateLedgerName(string memory oldName, string memory newName)
        external
    {
        Ledgers storage ts = ledgerStorage();
        ts.updateLedgerName(oldName, newName);
    }

    /**
     * @dev getLedgerInfoIds enables to retrieve a paginated list of the registered ledger info ids.
     */
    function getLedgerInfoIds(uint256 page, uint256 pageSize)
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
        Ledgers storage ts = ledgerStorage();
        return ts.getLedgerInfoIds(page, pageSize);
    }

    /**
     * @dev getLatestLedgerInfoById enables to retrieve the latest ledger info revision by the ledger id.
     */
    function getLatestLedgerInfoById(bytes32 ledgerInfoId)
        external
        view
        returns (bytes memory info)
    {
        Ledgers storage ts = ledgerStorage();
        return ts.getLatestLedgerInfoById(ledgerInfoId);
    }

    /**
     * @dev getLatestLedgerInfoByName enables to retrieve the latest ledger info
     * revision by the ledger name.
     */
    function getLatestLedgerInfoByName(string memory name)
        external
        view
        returns (bytes memory info)
    {
        Ledgers storage ts = ledgerStorage();
        return ts.getLatestLedgerInfoByName(name);
    }

    /**
     * @dev getLedgerInfoIdByName enables to retrieve the ledger info Id by the ledger name.
     */
    function getLedgerInfoIdByName(string memory name)
        external
        view
        returns (bytes32)
    {
        Ledgers storage ts = ledgerStorage();
        return ts.getLedgerInfoIdByName(name);
    }

    /**
     * @dev getLedgerInfoByRevisionId enables to retrieve a ledger info revision.
     */
    function getLedgerInfoByRevisionId(bytes32 ledgerInfoRevisionId)
        external
        view
        returns (bytes memory info)
    {
        Ledgers storage ts = ledgerStorage();
        return ts.getLedgerInfoByRevisionId(ledgerInfoRevisionId);
    }

    /**
     * @dev getLedgerInfoRevisionIds enables to retrieve a paginated list of ledger
     * info revision ids by any revision id.
     */
    function getLedgerInfoRevisionIds(
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
        Ledgers storage ts = ledgerStorage();
        return ts.getLedgerInfoRevisionIds(ledgerInfoId, page, pageSize);
    }
}
