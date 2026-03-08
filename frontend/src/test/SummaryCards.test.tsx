import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SummaryCards from "../components/SummaryCards";

vi.mock("../api", () => ({
  getDashboardSummary: vi.fn().mockResolvedValue({
    total_services: 5,
    by_status: { healthy: 3, degraded: 1, down: 1 },
    by_environment: { production: 4, staging: 1 },
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

describe("SummaryCards", () => {
  it("renders total services count", async () => {
    renderWithQuery(<SummaryCards />);
    expect(await screen.findByText("5")).toBeInTheDocument();
  });

  it("renders healthy count", async () => {
    renderWithQuery(<SummaryCards />);
    expect(await screen.findByText("3")).toBeInTheDocument();
  });
});
