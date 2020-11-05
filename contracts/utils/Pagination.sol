// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;

pragma experimental ABIEncoderV2;
import "../utils/math/SafeMath.sol";

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
        howMany = pageSize;

        // Page should be 1-based (the default and first page is 1)
        // uint256 curPage = page;
        cursor = 0;
        // if asked page and size is equal to total items
        uint256 totalItemsAsked = page.mul(pageSize);
        if (totalItemsAsked == total) {
            prev = 1;
            if (page > 1) {
                prev = page.sub(1);
            } //page=1 ?
            if (page > 1) {
                return (page.sub(1).mul(pageSize), pageSize, page, page);
            }
            return (0, pageSize, page, page);
        } else {
            if (totalItemsAsked < total) {
                // askedPage is less than the max page asked
                howMany = pageSize;
                prev = 1;
                cursor = 0;
                if (page > 1) {
                    prev = page.sub(1);
                    cursor = prev.mul(pageSize);
                }
                next = page.add(1);
            } else {
                // askedPage is strictly greater than the max page
                // rounded toward zero
                uint256 leftover = total.mod(pageSize);
                uint256 maxPage = total.div(pageSize);
                if (leftover > 0) {
                    maxPage = maxPage.add(1);
                }
                prev = 1;
                next = 1;
                uint256 maxItemsForPreviousPage = page.sub(1).mul(pageSize);
                if (maxItemsForPreviousPage >= total) {
                    // and there is no leftover we return 0 items
                    howMany = 0;
                    if (pageSize <= total) {
                        // prev and next should be the last page
                        prev = maxPage;
                        next = maxPage;
                    }
                } else {
                    // there is a leftover we should calculate
                    howMany = leftover;
                    cursor = maxItemsForPreviousPage;
                    if (pageSize <= total) {
                        // prev and next should be the last page
                        prev = maxPage.sub(1);
                        next = maxPage;
                    }
                }
            }
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
                items[i] = self[cursor.add(i)];
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
                items[i] = self[cursor.add(i)];
            }
        }

        return (items, self.length, howMany, prev, next);
    }
}
