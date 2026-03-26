import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminUsersPage from "@/app/admin/users/page";
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

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

describe("admin users group assignment integration", () => {
  const mockedApiGet = vi.mocked(api.get);
  const mockedApiPut = vi.mocked(api.put);

  beforeEach(() => {
    mockedApiGet.mockImplementation(async (url: string) => {
      if (url.startsWith("/admin/users")) {
        return {
          data: [
            {
              id: 1,
              username: "john_admin",
              email: "john@example.com",
              phone: "0500000000",
              user_type: "admin",
              is_active: true,
              groups: [],
            },
          ],
        };
      }

      if (url === "/admin/invitations") {
        return { data: [] };
      }

      if (url === "/couriers") {
        return { data: [] };
      }

      if (url === "/admin/groups") {
        return {
          data: {
            groups: [
              { id: 10, name: "support" },
              { id: 11, name: "finance" },
            ],
          },
        };
      }

      throw new Error(`Unexpected GET: ${url}`);
    });

    mockedApiPut.mockResolvedValue({ data: { message: "ok" } });
  });

  it("opens groups dialog and saves selected groups to the backend", async () => {
    const user = userEvent.setup();
    render(<AdminUsersPage />);

    const openGroups = await screen.findByTestId("open-groups-1");
    await user.click(openGroups);

    const checkbox = await screen.findByTestId("group-checkbox-10");
    await user.click(checkbox);

    await user.click(screen.getByTestId("save-user-groups"));

    await waitFor(() => {
      expect(mockedApiPut).toHaveBeenCalledWith("/admin/users/1", {
        group_ids: [10],
      });
    });
  });
});
