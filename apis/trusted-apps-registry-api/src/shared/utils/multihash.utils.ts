export const generateMultihash = (hash: string): string => {
  const hashLength = Buffer.from(hash.slice(2), "hex").length;
  const hashLengthHex = Buffer.from([hashLength]).toString("hex");
  const algCode = "12"; // code for sha2-256 in multihash
  return `${algCode}${hashLengthHex}${hash.slice(2)}`;
};

export default generateMultihash;
