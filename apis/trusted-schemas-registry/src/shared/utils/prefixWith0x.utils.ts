export const prefixWith0x = (key: string): string =>
  key.startsWith("0x") ? key : `0x${key}`;

export const remove0xPrefix = (key: string): string => key.replace(/^0x/, "");
