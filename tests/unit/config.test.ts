import { describe, expect, it } from "vitest";
import { getCatalogRoot } from "../../src/lib/catalog/paths";
import { getNeo4jConfig } from "../../src/lib/neo4j/config";

describe("shared config helpers", () => {
  it("resolves the default catalog root from cwd", () => {
    expect(getCatalogRoot("/tmp/demo", {})).toBe("/tmp/demo/public/catalog");
  });

  it("prefers explicit CATALOG_ROOT when present", () => {
    expect(getCatalogRoot("/tmp/demo", { CATALOG_ROOT: "/tmp/custom-catalog" })).toBe(
      "/tmp/custom-catalog",
    );
  });

  it("returns Neo4j defaults when env vars are absent", () => {
    expect(getNeo4jConfig({})).toEqual({
      uri: "bolt://localhost:7687",
      user: "neo4j",
      password: "researchgit-dev",
    });
  });

  it("returns Neo4j config from an injected env source", () => {
    expect(
      getNeo4jConfig({
        NEO4J_URI: "bolt://example:7687",
        NEO4J_USER: "alice",
        NEO4J_PASSWORD: "secret",
      }),
    ).toEqual({
      uri: "bolt://example:7687",
      user: "alice",
      password: "secret",
    });
  });
});
