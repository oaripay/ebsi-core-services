/**
 * Custom wrapper of Buffer.byteLength that auto-detects hex strings.
 * Gives the actual byte length of a string or a Buffer. encoding defaults to 'utf8'.
 * This is not the same as String.prototype.length since that returns the number of characters in a string.
 *
 * @param string string or Buffer to test.
 * @param encoding encoding used to evaluate (defaults to 'utf8')
 */
export const byteLength = (
  /* global NodeJS */
  input: string | NodeJS.ArrayBufferView | ArrayBuffer | SharedArrayBuffer,
  /* global BufferEncoding */
  encoding?: BufferEncoding,
): number => {
  // Auto-detect hex strings starting with 0x
  if (typeof input === "string" && input.startsWith("0x")) {
    return Buffer.byteLength(Buffer.from(input.slice(2), "hex"));
  }

  return Buffer.byteLength(input, encoding);
};

export default byteLength;
