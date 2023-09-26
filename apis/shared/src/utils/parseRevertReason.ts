export function parseRevertReason(revertReason: string): string {
  return Buffer.from(revertReason.substring(138), "hex")
    .toString()
    .replace(/[^a-zA-Z0-9:'. ]/g, "");
}

export default parseRevertReason;
