// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;

import "./DidMethodStorage.sol";
import "./DidMethodLib.sol";

contract DidMethodDetailed is DidMethodStorage {
    using DidMethodLib for DidMethodStorage.Methods;

    event AddNewDidMethod(
        string indexed methodNameId,
        string indexed ledgerNameId,
        string methodName,
        string ledgerName,
        bytes[] methodSpec,
        bytes32[] methodSpecHash,
        uint256 notBefore,
        uint256 notAfter,
        DidMethodStorage.MethodStatus status
    );
    event UpdateDidMethod(
        string indexed methodNameId,
        string indexed ledgerNameId,
        string methodName,
        string ledgerName,
        bytes[] methodSpec,
        bytes32[] methodSpecHash,
        uint256 notBefore,
        uint256 notAfter,
        DidMethodStorage.MethodStatus status
    );

    /**
     * @dev  enables to register a new didMethod (For EBSI V2.0, there is only one DID Method "did:ebsi").
     */
    function insertDidMethod(
        string memory methodName,
        string memory ledgerName,
        bytes[] memory methodSpec,
        bytes32[] memory methodSpecHash,
        uint256 notBefore,
        uint256 notAfter,
        DidMethodStorage.MethodStatus status
    ) external {
        DidMethodStorage.Methods storage ds = didMethodStorage();
        ds.insertDidMethod(
            methodName,
            ledgerName,
            methodSpec,
            methodSpecHash,
            notBefore,
            notAfter,
            status
        );
    }

    /**
     * @dev updateDidMethod enables to update an existing didMethod
     */
    function updateDidMethod(
        string memory methodName,
        string memory ledgerName,
        bytes[] memory methodSpec,
        bytes32[] memory methodSpecHash,
        uint256 notBefore,
        uint256 notAfter,
        DidMethodStorage.MethodStatus status
    ) external {
        DidMethodStorage.Methods storage ds = didMethodStorage();
        ds.updateDidMethod(
            methodName,
            ledgerName,
            methodSpec,
            methodSpecHash,
            notBefore,
            notAfter,
            status
        );
    }

    /**
     * Returns  returns DID Method details for a specific didMethodName. The Detail
     * info of a DID Method is stored in didMethodInfoStore[didMethodName]
     */
    function getDidMethodByName(string memory didMethodName)
        public
        view
        returns (DidMethodStorage.DidMethodInfoDetails memory method)
    {
        DidMethodStorage.Methods storage ds = didMethodStorage();
        return ds.getDidMethodByName(didMethodName);
    }

    /**
     * Returns returns a paginated list of registered Did Methods ids
     * (which are DID Method names).It returns the key of
     * didMethodInfoStore.Key(string)
     */
    function getDidMethodIds(uint256 page, uint256 pageSize)
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
        DidMethodStorage.Methods storage ds = didMethodStorage();
        return ds.getDidMethodIds(page, pageSize);
    }

    /**
     * Returns returns a paginated list of registered Did Methods ids
     * (which are DID Method names).It returns the key of
     * didMethodInfoStore.Key(string)
     */
    function getDidMethods(uint256 page, uint256 pageSize)
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
        DidMethodStorage.Methods storage ds = didMethodStorage();
        return ds.getDidMethods(page, pageSize);
    }
}
