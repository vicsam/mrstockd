import { createOrders } from "@mrstockd/catalog";
import { getDb } from "./server-env";

let instance: ReturnType<typeof createOrders> | undefined;

/** Server-only order-lifecycle service sharing the web app's db pool. */
export function getOrders() {
  if (instance) return instance;
  instance = createOrders({ db: getDb() });
  return instance;
}