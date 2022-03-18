import {
  AppLink,
  AppObject,
  AuthorizationLink,
  AuthorizationItemObject,
  PublicKeyLink,
} from "./apps.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";

export function formatApps(
  apps: AppObject[],
  total: number,
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string
): PaginatedList<AppLink> {
  // Reshape items
  const items = apps.map((app) => ({
    id: app.applicationId,
    name: app.name,
    href: `${baseUrl}/${encodeURIComponent(app.name)}`,
  }));

  return paginate<AppLink>(items, baseUrl, total, page, pageSize, extraQuery);
}

export function formatPublicKeys(
  publicKeys: string[],
  total: number,
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string
): PaginatedList<PublicKeyLink> {
  // Reshape items
  const items = publicKeys.map((publicKey) => ({
    id: publicKey,
    href: `${baseUrl}/${publicKey}`,
  }));

  return paginate<PublicKeyLink>(
    items,
    baseUrl,
    total,
    page,
    pageSize,
    extraQuery
  );
}

export function formatAuthorizations(
  authorizations: AuthorizationItemObject[],
  total: number,
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string
): PaginatedList<AuthorizationLink> {
  // Reshape items
  const items = authorizations.map((auth) => ({
    authorizationId: auth.authorizationId,
    requesterApplicationName: auth.authorizedAppName,
    href: `${baseUrl}/${auth.authorizationId}`,
  }));

  return paginate<AuthorizationLink>(
    items,
    baseUrl,
    total,
    page,
    pageSize,
    extraQuery
  );
}
