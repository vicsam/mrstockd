import { type Catalog, createCatalog } from "@mrstockd/catalog";
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
