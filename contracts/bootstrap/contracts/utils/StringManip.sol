// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

library StringManip {
    function convertToString(
        address account
    ) public pure returns (string memory) {
        return bytestoString(abi.encodePacked(account));
    }

    function bytestoString(
        bytes memory data
    ) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(2 + data.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < data.length; i++) {
            str[2 + i * 2] = alphabet[uint256(uint8(data[i] >> 4))];
            str[3 + i * 2] = alphabet[uint256(uint8(data[i] & 0x0f))];
        }
        return string(str);
    }
}
