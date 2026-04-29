import { env } from "@/env";
import { getNeo4jConfig } from "@/lib/neo4j/config";
import neo4j, { type Driver, type Session } from "neo4j-driver";
import type { ZodSchema } from "zod";

type GlobalWithDriver = typeof globalThis & { __neo4jDriver: Driver | null };

const globalScope = globalThis as GlobalWithDriver;
if (globalScope.__neo4jDriver === undefined) {
  globalScope.__neo4jDriver = null;
}

export function getDriver(): Driver {
  if (globalScope.__neo4jDriver === null) {
    const config = getNeo4jConfig({
      NEO4J_URI: env.NEO4J_URI,
      NEO4J_USER: env.NEO4J_USER,
      NEO4J_PASSWORD: env.NEO4J_PASSWORD,
    });
    globalScope.__neo4jDriver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.user, config.password),
      {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 5_000,
        connectionTimeout: 5_000,
        disableLosslessIntegers: true,
      },
    );
  }
  return globalScope.__neo4jDriver;
}

async function withSession<T>(work: (session: Session) => Promise<T>): Promise<T> {
  const session = getDriver().session();
  try {
    return await work(session);
  } finally {
    await session.close();
  }
}

export async function runRead<T>(
  cypher: string,
  params: Record<string, unknown>,
  schema: ZodSchema<T>,
): Promise<T[]> {
  return withSession(async (session) => {
    const result = await session.executeRead((tx) => tx.run(cypher, params));
    return result.records.map((record) => schema.parse(record.toObject()));
  });
}

export async function runWrite<T>(
  cypher: string,
  params: Record<string, unknown>,
  schema: ZodSchema<T>,
): Promise<T[]> {
  return withSession(async (session) => {
    const result = await session.executeWrite((tx) => tx.run(cypher, params));
    return result.records.map((record) => schema.parse(record.toObject()));
  });
}

export const runQuery = runRead;

export async function closeDriver(): Promise<void> {
  if (globalScope.__neo4jDriver !== null) {
    await globalScope.__neo4jDriver.close();
    globalScope.__neo4jDriver = null;
  }
}
