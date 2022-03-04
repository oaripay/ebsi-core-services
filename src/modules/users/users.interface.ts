export interface UserResponseObject {
  address: string;
  attributes: { [x: string]: string };
}

export interface UserLink {
  address: string;
  href: string;
}
