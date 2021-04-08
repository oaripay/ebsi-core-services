// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;

import "./DidMethodStorage.sol";
import "../bootstrap-ethereum-sc/contracts/utils/Pagination.sol";

library DidMethodLib {
    using Pagination for bytes32[];
    using Pagination for string[];

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
        DidMethodStorage.Methods storage ds,
        string memory methodName,
        string memory ledgerName,
        bytes[] memory methodSpec,
        bytes32[] memory methodSpecHash,
        uint256 notBefore,
        uint256 notAfter,
        DidMethodStorage.MethodStatus status
    ) external {
        require(
            keccak256(bytes(methodName)) != keccak256(bytes("")),
            "method empty"
        );
        require(
            keccak256(bytes(ledgerName)) != keccak256(bytes("")),
            "ledger empty"
        );
        require(methodSpec.length > 0, "methodSpec==0");
        require(methodSpecHash.length > 0, "methodSpecHash==0");
        require(
            status != DidMethodStorage.MethodStatus.undefined,
            "status undefined"
        );
        bytes32 methodHash = sha256(bytes(methodName));

        DidMethodStorage.DidMethodInfoDetails storage method =
            ds.didMethodInfoStore[methodHash];

        require(
            method.status == DidMethodStorage.MethodStatus.undefined,
            "method exist"
        );

        method.methodName = methodName;
        method.ledgerName = ledgerName;
        method.methodSpec = methodSpec;
        method.methodSpecHash = methodSpecHash;
        method.notBefore = notBefore;
        method.notAfter = notAfter;
        method.status = status;

        ds.didMethodIdList.push(methodHash);
        ds.didMethodNameList.push(methodName);
        emit AddNewDidMethod(
            methodName,
            ledgerName,
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
        DidMethodStorage.Methods storage ds,
        string memory methodName,
        string memory ledgerName,
        bytes[] memory methodSpec,
        bytes32[] memory methodSpecHash,
        uint256 notBefore,
        uint256 notAfter,
        DidMethodStorage.MethodStatus status
    ) external {
        require(
            keccak256(bytes(methodName)) != keccak256(bytes("")),
            "method empty"
        );
        require(
            keccak256(bytes(ledgerName)) != keccak256(bytes("")),
            "ledger empty"
        );
        require(methodSpec.length > 0, "methodSpec==0");
        require(methodSpecHash.length > 0, "methodSpecHash==0");
        require(
            status != DidMethodStorage.MethodStatus.undefined,
            "status undefined"
        );
        bytes32 methodHash = sha256(bytes(methodName));

        DidMethodStorage.DidMethodInfoDetails storage method =
            ds.didMethodInfoStore[methodHash];

        require(
            method.status != DidMethodStorage.MethodStatus.undefined,
            "method unknown"
        );
        method.ledgerName = ledgerName;
        method.methodSpec = methodSpec;
        method.methodSpecHash = methodSpecHash;
        method.notBefore = notBefore;
        method.notAfter = notAfter;
        method.status = status;

        emit UpdateDidMethod(
            methodName,
            ledgerName,
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
    Returns  returns DID Method details for a specific didMethodName. The Detail info of a DID Method is stored in didMethodInfoStore[didMethodName]
     */
    function getDidMethodByName(
        DidMethodStorage.Methods storage ds,
        string memory didMethodName
    )
        public
        view
        returns (DidMethodStorage.DidMethodInfoDetails memory method)
    {
        require(
            keccak256(bytes(didMethodName)) != keccak256(bytes("")),
            "method empty"
        );
        bytes32 methodHash = sha256(bytes(didMethodName));
        method = ds.didMethodInfoStore[methodHash];
        require(
            method.status != DidMethodStorage.MethodStatus.undefined,
            "method unknown"
        );
    }

    /**
    Returns returns a paginated list of registered Did Methods ids(which are DID Method names).It returns the key of didMethodInfoStore.Key(string)
     */
    function getDidMethods(
        DidMethodStorage.Methods storage ds,
        uint256 page,
        uint256 pageSize
    )
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
        require(pageSize <= 50, "PSize not <=50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");

        return ds.didMethodNameList.paginate(page, pageSize);
    }

    /**
    Returns returns a paginated list of registered Did Methods ids(which are DID Method names).It returns the key of didMethodInfoStore.Key(string)
     */
    function getDidMethodIds(
        DidMethodStorage.Methods storage ds,
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
        require(pageSize <= 50, "PSize not <=50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");

        return ds.didMethodIdList.paginate(page, pageSize);
    }
}
