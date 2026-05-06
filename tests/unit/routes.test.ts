import {
  dashboardHref,
  ideaGenerationHref,
  ideaHref,
  marketplaceHref,
  onboardingDashboardHref,
} from "@/lib/routes";
import { describe, expect, it } from "vitest";

describe("route helpers", () => {
  it("builds author-scoped dashboard and marketplace routes", () => {
    expect(dashboardHref("Yun Huang")).toBe("/dashboard?author=Yun%20Huang");
    expect(onboardingDashboardHref("Yun Huang")).toBe("/dashboard?author=Yun%20Huang&onboard=1");
    expect(onboardingDashboardHref("Yun Huang", "login 1")).toBe(
      "/dashboard?author=Yun%20Huang&onboard=login%201",
    );
    expect(marketplaceHref("Yun Huang")).toBe("/marketplace?author=Yun%20Huang");
  });

  it("builds selected-paper idea generation routes", () => {
    expect(ideaGenerationHref("Yiren Liu", "selected", ["paper one", "paper/two"])).toBe(
      "/ideas/new?author=Yiren%20Liu&mode=selected&paperId=paper%20one&paperId=paper%2Ftwo",
    );
  });

  it("builds status-specific idea routes", () => {
    expect(ideaHref("idea-1", "draft", "Hyanghee Park")).toBe(
      "/ideas/idea-1/draft?author=Hyanghee%20Park",
    );
    expect(ideaHref("idea-1", "open", "Hyanghee Park")).toBe(
      "/ideas/idea-1?author=Hyanghee%20Park",
    );
    expect(ideaHref("idea-1", "locked", "Hyanghee Park")).toBe(
      "/ideas/idea-1?author=Hyanghee%20Park",
    );
  });
});
