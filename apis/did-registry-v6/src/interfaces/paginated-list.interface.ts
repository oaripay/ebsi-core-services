export interface PaginatedList<T> {
  self?: string;
  items: T[];
  pageSize?: number;
  links?: {
    prev: string;
    next: string;
  };
}
