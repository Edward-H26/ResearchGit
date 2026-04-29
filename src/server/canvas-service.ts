import "server-only";
import type { StickyNote } from "@/lib/canvas/schema";
import { runRead, runWrite } from "@/lib/neo4j";
import { z } from "zod";

const SnapshotResultSchema = z.object({
  canvasId: z.string(),
  stickyCount: z.number().int(),
});
export type SnapshotResult = z.infer<typeof SnapshotResultSchema>;

export async function writeCanvasSnapshot(input: {
  ideaId: string;
  userId: string;
  notes: ReadonlyArray<StickyNote>;
}): Promise<SnapshotResult> {
  const cypher = `
    MATCH (i:Idea { id: $ideaId })
    MERGE (c:Canvas { ideaId: $ideaId })
    ON CREATE SET c.id = randomUUID(), c.createdAt = datetime()
    SET c.lastSnapshotAt = datetime(), c.lastActivityAt = datetime()
    MERGE (i)-[:HAS_CANVAS]->(c)
    WITH c
    OPTIONAL MATCH (c)-[oldRel:HAS_STICKY]->(old:Sticky)
    DELETE oldRel, old
    WITH c
    UNWIND $notes AS note
      CREATE (s:Sticky {
        id: note.id,
        text: note.text,
        x: note.x,
        y: note.y,
        width: note.width,
        height: note.height,
        intent: note.intent,
        authorUserId: note.authorUserId,
        authorHandle: note.authorHandle,
        rotation: note.rotation,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      MERGE (c)-[:HAS_STICKY]->(s)
    RETURN c.id AS canvasId, count(s) AS stickyCount
  `;
  const rows = await runWrite(
    cypher,
    { ideaId: input.ideaId, notes: input.notes },
    SnapshotResultSchema,
  );
  return rows[0] ?? { canvasId: "", stickyCount: 0 };
}

const CanvasStickiesSchema = z.object({
  canvasId: z.string().nullable(),
  notes: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      intent: z.enum(["add", "delete", "merge"]),
      authorUserId: z.string(),
      authorHandle: z.string(),
      rotation: z.number(),
    }),
  ),
});
export type CanvasStickies = z.infer<typeof CanvasStickiesSchema>;

export async function getCanvasStickies(ideaId: string): Promise<CanvasStickies> {
  const cypher = `
    OPTIONAL MATCH (i:Idea { id: $ideaId })-[:HAS_CANVAS]->(c:Canvas)
    OPTIONAL MATCH (c)-[:HAS_STICKY]->(s:Sticky)
    WITH c, collect(s) AS stickies
    RETURN
      c.id AS canvasId,
      [sticky IN stickies WHERE sticky IS NOT NULL |
        {
          id: sticky.id,
          text: sticky.text,
          x: sticky.x,
          y: sticky.y,
          width: sticky.width,
          height: sticky.height,
          intent: sticky.intent,
          authorUserId: sticky.authorUserId,
          authorHandle: sticky.authorHandle,
          rotation: sticky.rotation
        }
      ] AS notes
  `;
  const rows = await runRead(cypher, { ideaId }, CanvasStickiesSchema);
  return rows[0] ?? { canvasId: null, notes: [] };
}
