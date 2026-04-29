import "server-only";
import { env } from "@/env";
import { Liveblocks } from "@liveblocks/node";

let cached: Liveblocks | null = null;

export function getLiveblocks(): Liveblocks {
  if (!cached) {
    cached = new Liveblocks({ secret: env.LIVEBLOCKS_SECRET_KEY });
  }
  return cached;
}
