import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ServiceList from "../components/ServiceList";

vi.mock("../api", () => ({
  getServices: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: "HTTPBin",
      url: "https://httpbin.org",
      environment: "production",
      check_interval_seconds: 60,
      is_active: true,
      expected_version: null,
      latest_check: {
        status: "healthy",
        latency_ms: 120,
        actual_version: null,
        checked_at: new Date().toISOString(),
      },
    },
    {
      id: 2,
      name: "Fake API",
      url: "https://fake.api",
      environment: "staging",
      check_interval_seconds: 60,
      is_active: true,
      expected_version: null,
      latest_check: {
        status: "down",
        latency_ms: null,
        actual_version: null,
        checked_at: new Date().toISOString(),
      },
    },
  ]),
}));

const renderWithQuery = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
};

describe("ServiceList", () => {
  it("renders service names", async () => {
    renderWithQuery(
      <ServiceList selectedId={null} onSelect={vi.fn()} onAdd={vi.fn()} />,
    );
    expect(await screen.findByText("HTTPBin")).toBeInTheDocument();
    expect(await screen.findByText("Fake API")).toBeInTheDocument();
  });

  it("renders status badges", async () => {
    renderWithQuery(
      <ServiceList selectedId={null} onSelect={vi.fn()} onAdd={vi.fn()} />,
    );
    expect(await screen.findByText("healthy")).toBeInTheDocument();
    expect(await screen.findByText("down")).toBeInTheDocument();
  });

  it("renders add service button", async () => {
    renderWithQuery(
      <ServiceList selectedId={null} onSelect={vi.fn()} onAdd={vi.fn()} />,
    );
    expect(
      await screen.findByRole("button", { name: /add service/i }),
    ).toBeInTheDocument();
  });
});
