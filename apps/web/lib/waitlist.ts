import { createWaitlist } from "@mrstockd/catalog";
import { getDb } from "./server-env";

let instance: ReturnType<typeof createWaitlist> | undefined;

export function getWaitlist() {
  if (instance) return instance;
  instance = createWaitlist({ db: getDb() });
  return instance;
}
