export const prefixWith0x = (key: string): string =>
  key.startsWith("0x") ? key : `0x${key}`;

export const remove0xPrefix = (str: string): string =>
  str.startsWith("0x") ? str.slice(2) : str;
