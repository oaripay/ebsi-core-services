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

export interface PaginatedListWithoutTotal<T> {
  self?: string;
  items: T[];
  pageSize?: number;
  links?: {
    first: string;
    prev: string;
    next: string;
    last?: string;
  };
}
