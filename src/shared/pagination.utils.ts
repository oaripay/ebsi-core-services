export default function pagination(
  data: unknown[],
  inputPage: number,
  pageSize: number
): {
  items: unknown[];
  total: number;
  pageSize: number;
  prev: number;
  next: number;
} {
  const total: number = data.length;
  const lastPage = parseInt(Number((total - 1) / pageSize).toString(), 10);
  let page = inputPage;
  if (page > lastPage) page = lastPage;
  else if (page < 0) page = 0;

  const prev = page === 0 ? 0 : page - 1;
  const next = page >= lastPage ? lastPage : page + 1;

  const cursor = pageSize * page;
  const length = page < lastPage ? pageSize : total - cursor;

  const items: unknown[] = [];
  for (let i = cursor; i < cursor + length; i += 1) items.push(data[i]);

  return { items, total, pageSize, prev, next };
}
