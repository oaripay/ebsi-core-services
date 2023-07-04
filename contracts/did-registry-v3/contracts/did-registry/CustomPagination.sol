// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "./VRelationshipsStorage.sol";
import "@ebsiint-sc/bootstrap/contracts/utils/Pagination.sol";

library CustomPagination {
    function paginate(
        VRelationshipsStorage.DidWithPeriod[] memory self,
        uint256 page,
        uint256 pageSize
    )
        internal
        pure
        returns (
            VRelationshipsStorage.DidWithPeriod[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        uint256 cursor;
        (cursor, howMany, next, prev) = Pagination.getPaginationParameters(
            self.length,
            page,
            pageSize
        );
        items = new VRelationshipsStorage.DidWithPeriod[](howMany);
        if (howMany > 0) {
            for (uint256 i = 0; i < howMany; i++) {
                items[i] = self[cursor + i];
            }
        }

        return (items, self.length, howMany, prev, next);
    }
}
