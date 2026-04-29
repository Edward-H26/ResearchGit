export type Neo4jConfig = {
  uri: string;
  user: string;
  password: string;
};

type Neo4jEnvSource = Record<string, string | undefined>;

export function getNeo4jConfig(source: Neo4jEnvSource = process.env): Neo4jConfig {
  return {
    uri: source.NEO4J_URI ?? "bolt://localhost:7687",
    user: source.NEO4J_USER ?? "neo4j",
    password: source.NEO4J_PASSWORD ?? "researchgit-dev",
  };
}
