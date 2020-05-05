interface PaginateLinks {
  first: string;
  prev: string;
  next: string;
  last: string;
}

interface PaginateResult {
  items: any[];
  total: number;
  pageSize: number;
  links: PaginateLinks;
}

const paginate = (
  collection: Array<any>,
  baseUrl: string,
  inSize: number = 10,
  offset: number = 0
): PaginateResult => {
  if (!Array.isArray(collection)) {
    throw Error(`Expect array and got ${typeof collection}`);
  }
  const pageSize = +inSize; // forcing to be number type
  const paginatedItems = collection.slice(offset, offset + pageSize);
  const total = collection.length;
  const limit = offset + pageSize >= total ? total : offset + pageSize - 1;
  const separator = baseUrl.includes("?") ? "&" : "?";

  return {
    items: paginatedItems,
    total,
    pageSize,
    links: {
      first: `${baseUrl}${separator}page[after]=0&page[size]=${pageSize}`,
      prev: `${baseUrl}${separator}page[after]=${offset}&page[size]=${pageSize}`,
      next: `${baseUrl}${separator}page[after]=${limit}&page[size]=${pageSize}`,
      last: `${baseUrl}${separator}page[after]=${total}&page[size]=${pageSize}`,
    },
  };
};

export { paginate, PaginateResult, PaginateLinks };
