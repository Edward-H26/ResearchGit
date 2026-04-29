import { promises as fs } from "node:fs";
import {
  AllVenuesThemesSchema,
  type ClusterDetails,
  ClusterDetailsSchema,
  type ClusterTheme,
} from "@/lib/catalog/contracts";
import { getAllThemesPath, getClusterDetailsPath } from "@/lib/catalog/paths";

const clusterCache = new Map<number, Promise<ClusterDetails>>();
let themesCache: Promise<ClusterTheme[]> | null = null;

export async function loadCluster(clusterId: number): Promise<ClusterDetails> {
  const cached = clusterCache.get(clusterId);
  if (cached) return cached;

  const pending = fs
    .readFile(getClusterDetailsPath(clusterId), "utf8")
    .then((raw) => ClusterDetailsSchema.parse(JSON.parse(raw)));
  clusterCache.set(clusterId, pending);

  try {
    return await pending;
  } catch (error) {
    clusterCache.delete(clusterId);
    throw error;
  }
}

export async function loadAllThemes(): Promise<ClusterTheme[]> {
  if (!themesCache) {
    themesCache = fs
      .readFile(getAllThemesPath(), "utf8")
      .then((raw) => AllVenuesThemesSchema.parse(JSON.parse(raw)).themes)
      .catch((error) => {
        themesCache = null;
        throw error;
      });
  }

  return themesCache;
}

export async function loadTheme(clusterId: number): Promise<ClusterTheme | null> {
  const all = await loadAllThemes();
  return all.find((t) => t.cluster_id === clusterId) ?? null;
}

export function clearCatalogCache(): void {
  clusterCache.clear();
  themesCache = null;
}
