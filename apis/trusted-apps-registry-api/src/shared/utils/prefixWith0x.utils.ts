export const prefixWith0x = (key: string): string =>
  key.startsWith("0x") ? key : `0x${key}`;

export default prefixWith0x;
