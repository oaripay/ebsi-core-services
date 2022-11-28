export interface PaginatedList<T> {
  self?: string;
  items: T[];
  total: number;
  pageSize?: number;
  links?: {
    first: string;
    prev: string;
    next: string;
    last: string;
  };
}

export interface PaginatedList2<T> {
  self: string;
  items: T[];
  total?: number;
  pageSize: number;
  links: {
    first?: string;
    prev?: string;
    next?: string;
    last?: string;
  };
}
