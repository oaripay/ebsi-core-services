export function getReversedValue(
  page: number,
  pageSize: number,
  total: number
) {
  const pages = Math.ceil(total / pageSize);
  // reverse page
  return pages - (page - 1);
}
