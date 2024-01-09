/**
 * Extract named attributes from a mixed array (array with named keys and number keys) as returned by ethers.js parseTransaction
 */
export function extractNamedAttributes(
  mixedArray: unknown,
): Record<string, unknown> {
  if (
    !mixedArray ||
    typeof mixedArray !== "object" ||
    !Array.isArray(mixedArray)
  ) {
    throw new Error("Not a mixed array");
  }

  const keys = Object.keys(mixedArray).filter((key) =>
    Number.isNaN(parseInt(key, 10)),
  );

  return keys.reduce((obj, key) => {
    // @ts-expect-error Element implicitly has an 'any' type because index expression is not of type 'number'.ts(7015)
    const value: unknown = mixedArray[key];
    return { ...obj, [key]: value };
  }, {});
}

export default extractNamedAttributes;
