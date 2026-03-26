import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, beforeEach, expect, vi } from "vitest";
import SupportPage from "@/app/admin/support/page";
import { supportApi } from "@/lib/api/support";
import { api } from "@/lib/api";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => <a href={href}>{children as any}</a>,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/lib/api/support", () => ({
  supportApi: {
    getTickets: vi.fn(),
    createTicket: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe("admin support page integration", () => {
  const mockedGetTickets = vi.mocked(supportApi.getTickets);
  const mockedApiGet = vi.mocked(api.get);

  beforeEach(() => {
    mockedGetTickets.mockResolvedValue([
      {
        id: 101,
        subject: "Printer issue",
        status: "open",
        priority: "medium",
        created_at: "2026-03-26T08:00:00Z",
        user_id: 5,
        user_name: "Alice",
        assigned_to_name: "Support 1",
      },
    ]);

    mockedApiGet.mockResolvedValue({
      data: [
        {
          id: 202,
          title: "Sync delivery statuses",
          status: "in_progress",
          priority: "high",
          source: "requirements",
          assigned_to_name: "Support 2",
          created_at: "2026-03-26T09:00:00Z",
        },
      ],
    });
  });

  it("switches between tickets/tasks tabs and loads the matching dataset", async () => {
    const user = userEvent.setup();
    render(<SupportPage />);

    expect(await screen.findByText("Printer issue")).toBeInTheDocument();

    await user.click(screen.getByTestId("tasks-tab"));

    expect(await screen.findByText("Sync delivery statuses")).toBeInTheDocument();
    expect(mockedApiGet).toHaveBeenCalledWith("/tasks", { params: {} });
  });

  it("applies quick assigned filter and sends assigned_to=me to tickets API", async () => {
    const user = userEvent.setup();
    render(<SupportPage />);

    await screen.findByText("Printer issue");
    await user.click(screen.getByTestId("quick-mine"));

    await waitFor(() => {
      expect(mockedGetTickets).toHaveBeenLastCalledWith({
        status: undefined,
        assigned_to: "me",
      });
    });
  });

  it("applies task source filter and sends source to tasks API", async () => {
    const user = userEvent.setup();
    render(<SupportPage />);

    await screen.findByText("Printer issue");
    await user.click(screen.getByTestId("tasks-tab"));

    const sourceFilter = await screen.findByTestId("source-filter");
    await user.selectOptions(sourceFilter, "requirements");

    await waitFor(() => {
      expect(mockedApiGet).toHaveBeenCalledWith("/tasks", {
        params: { source: "requirements" },
      });
    });
  });
});
