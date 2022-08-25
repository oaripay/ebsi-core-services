export function sliceText(text: string, size = 4) {
  return `${text.slice(0, size)}...${text.slice(-size)}`;
}
