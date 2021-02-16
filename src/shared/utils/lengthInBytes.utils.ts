export const lengthInBytes = (str: string): number =>
  new TextEncoder().encode(str).length;

export default { lengthInBytes };
