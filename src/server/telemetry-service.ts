import "server-only";
import { runWrite } from "@/lib/neo4j";
import type { TelemetryEvent } from "@/lib/telemetry/types";
import { requireFirstResult } from "@/server/result";
import { z } from "zod";

const WriteResultSchema = z.object({
  count: z.number().int(),
});

export async function writeEventBatch(input: {
  userId: string;
  events: ReadonlyArray<TelemetryEvent>;
}): Promise<number> {
  const events = input.events.map((event) => ({
    kind: event.kind,
    ts: event.ts,
    payloadJson: JSON.stringify({
      ...event.payload,
      ...(event.ideaId ? { ideaId: event.ideaId } : {}),
      ...(event.stickyId ? { stickyId: event.stickyId } : {}),
    }),
  }));

  const cypher = `
    MATCH (u:User { id: $userId })
    UNWIND $events AS evt
    CREATE (e:Event {
      id: randomUUID(),
      kind: evt.kind,
      ts: datetime(evt.ts),
      payload: evt.payloadJson
    })
    MERGE (u)-[:EMITTED]->(e)
    RETURN count(e) AS count
  `;

  const result = await runWrite(cypher, { userId: input.userId, events }, WriteResultSchema);
  return requireFirstResult(result, `User ${input.userId} was not found for telemetry write`).count;
}
