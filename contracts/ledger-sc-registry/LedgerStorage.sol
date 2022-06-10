// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "../trusted-policies-registry-ethereum-sc/contracts/trusted-policies-registry/interfaces/IPolicyRegistry.sol";

contract LedgerStorage {
    // The state variables we care about.
    bytes32 public constant LEDGER_DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.ledger.storage");

    struct Ledgers {
        uint256 _version;
        // An ordered list of registered ledger info ids
        bytes32[] ledgerInfoIdList;
        // A ledger name to ledger info id map
        mapping(string => bytes32) ledgerNameToLedgerInfoId;
        // A ledger info revision id to ledger info id map
        // key is SHA2-256 hash of the given ledger info revision
        // value is the SC info Id
        mapping(bytes32 => bytes32) ledgerInfoRevIdToLedgerInfoId;
        // A ledger info id to ledger info revisions id map
        mapping(bytes32 => bytes32[]) ledgerStore;
        // A ledger info revision id to ledger info map
        mapping(bytes32 => bytes) ledgerInfoStore;
        IPolicyRegistry trustedPolicyRegistry;
    }

    // Creates and returns the storage pointer to the struct.
    function ledgerStorage() internal pure returns (Ledgers storage ms) {
        bytes32 position = LEDGER_DIAMOND_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }
}
