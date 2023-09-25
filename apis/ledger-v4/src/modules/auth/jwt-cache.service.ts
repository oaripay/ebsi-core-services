import { Injectable, Logger } from "@nestjs/common";

// Map JWT with its "exp" field
interface JwtCache {
  [x: string]: number;
}

// Clean up cache every 5 minutes
const JWT_CACHE_CLEANUP_INTERVAL = 5 * 60;

// Never store a JWT for more than 30 minutes
const JWT_CACHE_MAX_LIFETIME = 30 * 60;

@Injectable()
export class JwtCacheService {
  private readonly logger = new Logger(JwtCacheService.name);

  private cache: JwtCache;

  private lastCacheCleanup: number;

  constructor() {
    this.cache = {};
    this.lastCacheCleanup = Math.floor(Date.now() / 1000);
  }

  /**
   * Adds a new entry in the cache.
   *
   * @param token - JWT to add
   * @param exp - Token expiration time
   */
  add(token: string, exp: number): void {
    this.logger.debug(`Storing token in cache: ${token}`);
    this.cache[token] = exp;
  }

  /**
   * Safely adds a new entry in the cache.
   *
   * @param token - JWT to add
   * @param now - Current timestamp (e.g. `Math.floor(Date.now() / 1000)`)
   * @param exp - Token expiration time
   */
  safeAdd(token: string, now: number, exp?: number): void {
    if (!exp) {
      this.add(token, now + JWT_CACHE_MAX_LIFETIME);
    } else if (exp > now) {
      this.add(token, Math.min(exp, now + JWT_CACHE_MAX_LIFETIME));
    } else {
      this.logger.warn("Tried to cache an expired token. Aborted.");
    }
  }

  /**
   * Removes an entry from the cache.
   *
   * @param token - JWT to remove
   */
  remove(token: string): void {
    this.logger.debug(`Removing token: ${token}`);
    delete this.cache[token];
  }

  /**
   * Checks if token is valid (compared to "now").
   *
   * @param token - JWT to check
   * @param now - Current timestamp (e.g. `Math.floor(Date.now() / 1000)`)
   * @returns boolean Returns true if the token is cached and still valid.
   */
  isValid(token: string, now: number): boolean {
    const exp = this.cache[token];

    if (!exp || !now) return false;

    // If cached token is expired, remove it
    if (exp < now) {
      this.remove(token);
      return false;
    }

    return true;
  }

  /**
   * Removes all the expired cache entries.
   *
   * @param now - Current timestamp (e.g. `Math.floor(Date.now() / 1000)`)
   */
  clear(now: number): void {
    this.logger.debug("Clearing JWT cache");
    Object.keys(this.cache).forEach((jwt) => {
      if (this.cache[jwt] < now) {
        this.remove(jwt);
      }
    });
    this.lastCacheCleanup = now;
  }

  /**
   * Runs maintenance tasks if they haven't run for a long time.
   *
   * @param now - Current timestamp (e.g. `Math.floor(Date.now() / 1000)`)
   */
  doctor(now: number): void {
    if (now > this.lastCacheCleanup + JWT_CACHE_CLEANUP_INTERVAL) {
      this.clear(now);
    }
  }
}

export default JwtCacheService;
