import path from "node:path";

type CatalogEnvSource = Record<string, string | undefined>;

export function getCatalogRoot(
  cwd: string = process.cwd(),
  source: CatalogEnvSource = process.env,
): string {
  return source.CATALOG_ROOT ?? path.join(cwd, "public", "catalog");
}

export function getClusterDetailsPath(clusterId: number, cwd?: string): string {
  return path.join(getCatalogRoot(cwd), "cluster_details", `cluster_${clusterId}.json`);
}

export function getAllThemesPath(cwd?: string): string {
  return path.join(getCatalogRoot(cwd), "all_venues_cluster_themes.json");
}
