import "server-only";
import {
  type IdeaStoreState,
  STORE_VERSION,
  initialIdeaStoreState,
  normalizeIdeaStoreState,
} from "@/lib/ideas/store";
import { runRead, runWrite } from "@/lib/neo4j";
import { z } from "zod";

const STORE_ID = "v2";

type GlobalWithIdeaStore = typeof globalThis & {
  __researchgitIdeaStore?: IdeaStoreState;
  __researchgitIdeaStoreNeo4jDisabled?: boolean;
};

const globalScope = globalThis as GlobalWithIdeaStore;
let mutationQueue: Promise<unknown> = Promise.resolve();

const IdeaStoreRowSchema = z.object({
  stateJson: z.string().nullable(),
});

function getMemoryState(): IdeaStoreState {
  if (!globalScope.__researchgitIdeaStore) {
    globalScope.__researchgitIdeaStore = initialIdeaStoreState();
  }
  return globalScope.__researchgitIdeaStore;
}

function getCachedMemoryState(): IdeaStoreState | null {
  return globalScope.__researchgitIdeaStore ?? null;
}

function saveMemoryState(state: IdeaStoreState): IdeaStoreState {
  globalScope.__researchgitIdeaStore = state;
  return state;
}

function parseState(stateJson: string | null): IdeaStoreState | null {
  if (!stateJson) return null;
  const parsed = JSON.parse(stateJson) as IdeaStoreState;
  if (parsed.version !== STORE_VERSION) return null;
  return normalizeIdeaStoreState(parsed);
}

async function readNeo4jState(): Promise<IdeaStoreState | null> {
  const rows = await runRead(
    `
      MATCH (s:IdeaStore { id: $id })
      RETURN s.stateJson AS stateJson
    `,
    { id: STORE_ID },
    IdeaStoreRowSchema,
  );
  return parseState(rows[0]?.stateJson ?? null);
}

async function writeNeo4jState(state: IdeaStoreState): Promise<void> {
  await runWrite(
    `
      MERGE (s:IdeaStore { id: $id })
      SET s.version = $version,
          s.stateJson = $stateJson,
          s.updatedAt = datetime()
      RETURN s.stateJson AS stateJson
    `,
    {
      id: STORE_ID,
      version: state.version,
      stateJson: JSON.stringify(state),
    },
    IdeaStoreRowSchema,
  );
}

async function ensureNeo4jState(): Promise<IdeaStoreState> {
  const existing = await readNeo4jState();
  if (existing) return existing;

  const initial = initialIdeaStoreState();
  await writeNeo4jState(initial);
  return initial;
}

export async function getIdeaStoreState(): Promise<IdeaStoreState> {
  if (globalScope.__researchgitIdeaStoreNeo4jDisabled) return getMemoryState();
  const cachedState = getCachedMemoryState();
  if (cachedState) return cachedState;

  try {
    const state = await ensureNeo4jState();
    saveMemoryState(state);
    return state;
  } catch {
    globalScope.__researchgitIdeaStoreNeo4jDisabled = true;
    return getMemoryState();
  }
}

export async function saveIdeaStoreState(state: IdeaStoreState): Promise<IdeaStoreState> {
  if (globalScope.__researchgitIdeaStoreNeo4jDisabled) return saveMemoryState(state);

  try {
    await writeNeo4jState(state);
    return saveMemoryState(state);
  } catch {
    globalScope.__researchgitIdeaStoreNeo4jDisabled = true;
    return saveMemoryState(state);
  }
}

export async function mutateIdeaStoreState<T extends { state: IdeaStoreState }>(
  mutator: (state: IdeaStoreState) => T,
): Promise<T> {
  const executeMutation = async () => {
    const current = await getIdeaStoreState();
    const result = mutator(current);
    await saveIdeaStoreState(result.state);
    return result;
  };
  const queued = mutationQueue.then(executeMutation, executeMutation);
  mutationQueue = queued.then(
    () => undefined,
    () => undefined,
  );
  return queued;
}
