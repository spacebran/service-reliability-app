import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AiSummary from "../components/AiSummary";

vi.mock("../api", () => ({
  getAiSummary: vi.fn().mockResolvedValue({
    summary:
      "The Fake API service experienced DNS resolution failures throughout the monitoring period.",
  }),
}));

const renderWithQuery = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
};

describe("AiSummary", () => {
  it("renders the summary text", async () => {
    renderWithQuery(<AiSummary />);
    expect(
      await screen.findByText(/DNS resolution failures/i),
    ).toBeInTheDocument();
  });

  it("renders the refresh button", async () => {
    renderWithQuery(<AiSummary />);
    expect(
      await screen.findByRole("button", { name: /refresh/i }),
    ).toBeInTheDocument();
  });

  it("renders the section heading", async () => {
    renderWithQuery(<AiSummary />);
    expect(await screen.findByText(/AI Incident Summary/i)).toBeInTheDocument();
  });
});
