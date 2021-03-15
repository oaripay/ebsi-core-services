// Generates a range
// Example: range(0, 5) => [0, 1, 2, 3, 4, 5]
export const range = (start: number, stop: number): number[] =>
  Array.from({ length: stop - start + 1 }, (_, i) => start + i);

export default { range };
