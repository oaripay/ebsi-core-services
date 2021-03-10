// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;

import "./math/SafeMath.sol";

library Pagination {
    using SafeMath for uint256;

    function getPaginationParameters(
        uint256 total,
        uint256 page,
        uint256 pageSize
    )
        internal
        pure
        returns (
            uint256 cursor,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        uint256 curPage = page;
        uint256 mod = total.mod(pageSize);

        uint256 lastPage = total.div(pageSize);
        if (mod > 0) lastPage = lastPage + 1;

        // calculate the number of items to get
        if (curPage > lastPage) {
            howMany = 0;
        } else if (curPage == lastPage && mod != 0) {
            howMany = mod;
        } else {
            howMany = pageSize;
        }

        // calculate the cursor
        cursor = curPage.sub(1) * pageSize;

        // calculate prev and next pages
        next = curPage + 1;
        if (next > lastPage) {
            next = lastPage;
        }

        prev = curPage.sub(1);
        if (prev == 0) {
            prev = 1;
        } else if (prev > lastPage) {
            prev = lastPage;
        }

        return (cursor, howMany, next, prev);
    }

    function paginate(
        string[] storage self,
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
        uint256 cursor;
        (cursor, howMany, next, prev) = getPaginationParameters(
            self.length,
            page,
            pageSize
        );
        items = new string[](howMany);
        if (howMany > 0) {
            for (uint256 i = 0; i < howMany; i++) {
                items[i] = self[cursor + i];
            }
        }

        return (items, self.length, howMany, prev, next);
    }

    function paginate(
        bytes32[] memory self,
        uint256 page,
        uint256 pageSize
    )
        internal
        pure
        returns (
            bytes32[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        uint256 cursor;
        (cursor, howMany, next, prev) = getPaginationParameters(
            self.length,
            page,
            pageSize
        );
        items = new bytes32[](howMany);
        if (howMany > 0) {
            for (uint256 i = 0; i < howMany; i++) {
                items[i] = self[cursor + i];
            }
        }

        return (items, self.length, howMany, prev, next);
    }

    /* Paginate Ids based on the number of Ids.
       Id is incremental, the first index is 0.
       Self corresponds to the total number of ids   */
    function paginate(
        uint256 self,
        uint256 page,
        uint256 pageSize
    )
        internal
        pure
        returns (
            uint256[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        uint256 cursor;
        (cursor, howMany, next, prev) = getPaginationParameters(
            self,
            page,
            pageSize
        );
        items = new uint256[](howMany);
        if (howMany > 0) {
            for (uint256 i = 0; i < howMany; i++) {
                items[i] = cursor + i;
            }
        }

        return (items, self, howMany, prev, next);
    }

    function paginate(
        bytes[] storage self,
        uint256 page,
        uint256 pageSize
    )
    public
    view
    returns (
        bytes[] memory items,
        uint256 total,
        uint256 howMany,
        uint256 prev,
        uint256 next
    )
    {
        uint256 cursor;
        (cursor, howMany, next, prev) = getPaginationParameters(
            self.length,
            page,
            pageSize
        );
        items = new bytes[](howMany);
        if (howMany > 0) {
            for (uint256 i = 0; i < howMany; i++) {
                items[i] = self[cursor + i];
            }
        }

        return (items, self.length, howMany, prev, next);
    }

}
