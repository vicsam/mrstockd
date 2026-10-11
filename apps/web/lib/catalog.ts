import { type Analytics, type Catalog, createAnalytics, createCatalog, createInterests, type Interests } from "@mrstockd/catalog";
import { parseEncryptionKey } from "@mrstockd/core";
import { getDb, serverEnv } from "./server-env";

let instance: Catalog | undefined;

export function getCatalog(): Catalog {
  if (instance) return instance;
  const env = serverEnv();
  instance = createCatalog({
    db: getDb(),
    encryptionKey: parseEncryptionKey(env.UPSTREAM_SECRET_ENCRYPTION_KEY),
    allowPrivateEndpoints: env.GATEWAY_ALLOW_PRIVATE_UPSTREAMS === "true",
  });
  return instance;
}

let analytics: Analytics | undefined;

/** Dashboard numbers. Seller views are owner-scoped; check reviewer rights before the admin view. */
export function getAnalytics(): Analytics {
  analytics ??= createAnalytics({ db: getDb() });
  return analytics;
}

let interests: Interests | undefined;

/** Onboarding topics each user picked. */
export function getInterests(): Interests {
  interests ??= createInterests({ db: getDb() });
  return interests;
}
