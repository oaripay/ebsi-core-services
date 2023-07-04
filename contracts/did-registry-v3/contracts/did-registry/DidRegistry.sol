// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

// solhint-disable-next-line max-line-length
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./DidStorage.sol";
import "./DidDocumentDetailed.sol";

contract DidRegistry is DidStorage, DidDocumentDetailed, Initializable {
    IPolicyRegistry public immutable policyRegistryContract;
    IDidRegistry public immutable didRegistryContractV2;

    event NewVersion(uint);

    constructor(address _tprAddress, address _didRegistryV2Address) {
        require(
            _tprAddress != address(0) && _didRegistryV2Address != address(0),
            "zero address"
        );
        policyRegistryContract = IPolicyRegistry(_tprAddress);
        didRegistryContractV2 = IDidRegistry(_didRegistryV2Address);
        _disableInitializers();
    }

    /**
     * @dev Returns the version of the DidRegistry SC
     */
    function version() external view returns (uint256) {
        TSC storage ts = DidStorage.tscStorage();
        return ts.version;
    }

    function initialize(uint256 v) public initializer {
        _onInitialize(v);
    }

    // internal functions

    function _onInitialize(uint256 _version) internal onlyInitializing {
        setVersion(_version);
    }

    /**
     * @dev set the version of the DidRegistry SC
     */
    function setVersion(uint256 _version) internal {
        TSC storage ts = DidStorage.tscStorage();
        ts.version = _version;
        emit NewVersion(_version);
    }

    function getTrustedPolicyRegistry()
        internal
        view
        virtual
        override
        returns (IPolicyRegistry)
    {
        return policyRegistryContract;
    }

    function getDidRegistryV2()
        internal
        view
        virtual
        override
        returns (IDidRegistry)
    {
        return didRegistryContractV2;
    }
}
