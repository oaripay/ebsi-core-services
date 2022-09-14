import { BigNumber } from "ethers";

export function getEthObject(o: unknown): unknown {
  if (BigNumber.isBigNumber(o)) {
    return o.toString();
  }

  if (!Array.isArray(o)) {
    return o;
  }

  const obj = o as string[] & Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.some((k) => Number.isNaN(Number(k)))) {
    // is an object
    const result: Record<string, unknown> = {};
    keys.forEach((k, i) => {
      if (i >= keys.length / 2) {
        result[k] = getEthObject(obj[k]);
      }
    });
    return result;
  }

  // is an array
  return keys.map((k) => getEthObject(obj[k]));
}

export default getEthObject;
