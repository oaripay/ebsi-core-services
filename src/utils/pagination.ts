const paginate = (
  collection: Array<any>,
  baseUrl: string,
  pageSize: number = 10,
  offset: number = 0
) => {
  if (!Array.isArray(collection)) {
    throw Error(`Expect array and got ${typeof collection}`);
  }
  const paginatedItems = collection.slice(offset, offset + pageSize);
  const total = collection.length;
  const limit = offset + pageSize >= total ? total : offset + pageSize - 1;

  return {
    items: paginatedItems,
    total,
    pageSize,
    links: {
      first: `${baseUrl}?page[after]=0&page[size]=${pageSize}`,
      prev: `${baseUrl}?page[after]=${offset}&page[size]=${pageSize}`,
      next: `${baseUrl}?page[after]=${limit}&page[size]=${pageSize}`,
      last: `${baseUrl}?page[after]=${total}&page[size]=${pageSize}`,
    },
  };
};

export default paginate;
