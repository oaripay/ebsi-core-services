export interface AppLink {
  id: string;
  name: string;
  href: string;
}

export interface AppObject {
  applicationId: string;
  name: string;
}

export interface AuthorizationLink {
  authorizationId: string;
  requesterApplicationName: string;
  href: string;
}

export interface AuthorizationItemObject {
  authorizationId: string;
  authorizedAppName: string;
}

export interface AuthorizationObject {
  applicationId: string;
  authorizedAppId: string;
  name: string;
  authorizedAppName: string;
  iss: string;
  status: number;
  permissions: number;
  notBefore: number;
  notAfter: number;
}

export interface AuthorizationResponseObject {
  authorizationId: string;
  resourceApplicationId: string;
  requesterApplicationId: string;
  resourceApplicationName: string;
  requesterApplicationName: string;
  iss: string;
  permissions: {
    create: string;
    read: string;
    update: string;
    delete: string;
  };
  status: string;
  notBefore: number;
  notAfter: number;
}

export interface AppResponseObject {
  applicationId: string;
  name: string;
  domain: string;
  administrators: string[];
  publicKeys: string[];
  info: {
    [x: string]: unknown;
  };
  authorizations: AuthorizationResponseObject[];
}
