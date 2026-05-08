import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  responsesCreate: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/env", () => ({
  env: {
    OPENAI_API_KEY: "test-key",
    OPENAI_MODEL: "gpt-test",
    RESEARCHGIT_E2E_AUTHOR_BYPASS: "1",
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => null),
}));

vi.mock("@/lib/auth/author", () => ({
  resolveActionAuthorName: vi.fn(() => "Ziyi Zhang"),
}));

vi.mock("@/lib/llm/client", () => ({
  getOpenAIClient: vi.fn(() => ({
    responses: {
      create: mocks.responsesCreate,
    },
  })),
}));

describe("POST /api/canvas/enhance-sticky", () => {
  it("asks OpenAI Responses API to refine a sticky note with canvas context", async () => {
    mocks.responsesCreate.mockResolvedValueOnce({
      output_text: "Refined sticky note grounded in the selected CHI paper.",
    });
    const { POST } = await import("@/app/api/canvas/enhance-sticky/route");

    const response = await POST(
      new Request("http://localhost/api/canvas/enhance-sticky", {
        method: "POST",
        body: JSON.stringify({
          actorName: "Ziyi Zhang",
          noteText: "Needs stronger evidence",
          optionId: "evidence",
          context: {
            boardTitle: "Paper canvas",
            activePaperTitle: "Virtual Minds, Real Work",
            relatedPaperTitles: ["Personal Validation Effect in LLMs"],
            sourceSummary: "A CHI 2026 paper about multi-agent collaboration.",
            otherNotes: ["Compare planning outcomes across teams."],
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      actorName: "Ziyi Zhang",
      text: "Refined sticky note grounded in the selected CHI paper.",
    });
    expect(mocks.responsesCreate).toHaveBeenCalledWith({
      model: "gpt-test",
      input: expect.stringContaining("Needs stronger evidence"),
    });
    const request = mocks.responsesCreate.mock.calls[0]?.[0] as { input: string };
    expect(request.input).toContain("Virtual Minds, Real Work");
    expect(request.input).toContain("Personal Validation Effect in LLMs");
    expect(request.input).toContain("A CHI 2026 paper about multi-agent collaboration.");
    expect(request.input).toContain("Compare planning outcomes across teams.");
  });

  it("does not invent a local fallback when the model returns no text", async () => {
    mocks.responsesCreate.mockResolvedValueOnce({
      output_text: "",
    });
    const { POST } = await import("@/app/api/canvas/enhance-sticky/route");

    const response = await POST(
      new Request("http://localhost/api/canvas/enhance-sticky", {
        method: "POST",
        body: JSON.stringify({
          actorName: "Ziyi Zhang",
          noteText: "Needs stronger evidence",
          optionId: "evidence",
          context: {
            boardTitle: "Paper canvas",
          },
        }),
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "empty_ai_response" });
  });

  it("accepts long canvas context by trimming it before calling the model", async () => {
    mocks.responsesCreate.mockResolvedValueOnce({
      output_text: "Trimmed context response.",
    });
    const { POST } = await import("@/app/api/canvas/enhance-sticky/route");

    const response = await POST(
      new Request("http://localhost/api/canvas/enhance-sticky", {
        method: "POST",
        body: JSON.stringify({
          actorName: "Ziyi Zhang",
          noteText: `${" ".repeat(8)}Needs stronger evidence`,
          optionId: "clarity",
          context: {
            boardTitle: " Topic canvas ",
            relatedPaperTitles: Array.from({ length: 12 }, (_, index) => `Paper ${index + 1}`),
            otherNotes: Array.from({ length: 10 }, (_, index) => `Note ${index + 1}`),
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    const request = mocks.responsesCreate.mock.calls.at(-1)?.[0] as { input: string };
    expect(request.input).toContain("Paper 6");
    expect(request.input).not.toContain("Paper 7");
    expect(request.input).toContain("Note 6");
    expect(request.input).not.toContain("Note 7");
    expect(request.input).toContain("Needs stronger evidence");
  });
});
