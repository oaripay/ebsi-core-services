export function prefix0x(value: string): string {
  return value.startsWith("0x") ? value : `0x${value}`;
}

export default prefix0x;
