// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "@ebsiint-sc/bootstrap/contracts/utils/Pagination.sol";
import "./ControllersStorage.sol";
import "./UtilsLib.sol";

library ControllersLib {
    using Pagination for string[];

    function linkDidToController(
        ControllersStorage.Controllers storage cs,
        string memory did,
        string memory controller
    ) external returns (bool) {
        uint index = cs.didsByController[controller].length;
        cs.didsByController[controller].push(did);
        cs.didsByControllerIndex[controller][did] = index;
        return true;
    }

    function unlinkDidFromController(
        ControllersStorage.Controllers storage cs,
        string memory did,
        string memory controller
    ) external returns (bool) {
        string[] storage dids = cs.didsByController[controller];
        uint index = cs.didsByControllerIndex[controller][did];

        if (UtilsLib.equalStrings(dids[index], did)) {
            // correct index
            dids[index] = dids[dids.length - 1];
            // remap index
            cs.didsByControllerIndex[controller][did] = 0;
            cs.didsByControllerIndex[controller][dids[index]] = index;
            dids.pop();
        }
        return true;
    }

    function getDidsByController(
        ControllersStorage.Controllers storage cs,
        string memory controller,
        uint256 page,
        uint256 pageSize
    )
        external
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
        return cs.didsByController[controller].paginate(page, pageSize);
    }
}
