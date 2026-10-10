import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const handler = (request: Request) => getAuth().handler(request);

export const { GET, POST } = toNextJsHandler(handler);
