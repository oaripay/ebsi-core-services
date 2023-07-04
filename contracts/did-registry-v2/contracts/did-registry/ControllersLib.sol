// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "@ebsiint-sc/bootstrap/contracts/utils/Pagination.sol";
import "./ControllersStorage.sol";

library ControllersLib {
    using Pagination for string[];

    function equalStrings(
        string memory a,
        string memory b
    ) internal pure returns (bool) {
        if (abi.encodePacked(a).length != abi.encodePacked(b).length) {
            return false;
        }
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }

    function addController(
        ControllersStorage.Controllers storage ds,
        string memory did,
        string memory controller
    ) external returns (bool) {
        ds.didsByController[controller].push(did);
        return true;
    }

    function revokeController(
        ControllersStorage.Controllers storage ds,
        string memory did,
        string memory controller
    ) external returns (bool) {
        string[] storage dids = ds.didsByController[controller];
        for (uint256 i = 0; i < dids.length; i++) {
            if (equalStrings(dids[i], did)) {
                // swap with the last did and pop the last one
                dids[i] = dids[dids.length - 1];
                dids.pop();
                break;
            }
        }
        return true;
    }

    function getDidsByController(
        ControllersStorage.Controllers storage ds,
        string memory controller,
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
        require(pageSize <= 50, "pageSize must be <= 50");
        return ds.didsByController[controller].paginate(page, pageSize);
    }
}
