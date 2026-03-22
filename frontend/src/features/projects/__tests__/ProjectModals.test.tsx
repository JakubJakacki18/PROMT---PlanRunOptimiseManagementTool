/**
 * Unit tests for AddProjectModal and EditProjectModal components.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddProjectModal from "../components/AddProjectModal";
import EditProjectModal from "../components/EditProjectModal";
import type { Project } from "../../types/project";

describe("AddProjectModal", () => {
  let onClose: ReturnType<typeof vi.fn>;
  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClose = vi.fn();
    onSubmit = vi.fn().mockResolvedValue(undefined);
  });

  it("does not render when open=false", () => {
    const { container } = render(
      <AddProjectModal open={false} onClose={onClose} onSubmit={onSubmit} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders modal when open=true", () => {
    render(
      <AddProjectModal open={true} onClose={onClose} onSubmit={onSubmit} />
    );
    expect(screen.getByText("Dodaj projekt")).toBeInTheDocument();
  });
});

describe("EditProjectModal", () => {
  let onClose: ReturnType<typeof vi.fn>;
  let onSubmit: ReturnType<typeof vi.fn>;
  const project: Project = {
    id: 42,
    name: "Existing Project",
    description: "Some desc",
    status: "active",
    start_date: "2026-03-01",
    end_date: "2026-09-30",
    funding_ids: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    owner: 1,
  };

  beforeEach(() => {
    onClose = vi.fn();
    onSubmit = vi.fn().mockResolvedValue(undefined);
  });

  it("TC135: shows status select with three options", () => {
    render(
      <EditProjectModal
        open={true}
        project={project}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );
    const options = screen.getAllByRole("option");
    const statusOptions = options.filter((o) =>
      ["Nowy", "Aktywny", "Zamknięty"].includes(o.textContent || "")
    );
    expect(statusOptions).toHaveLength(3);
  });

  it("closes on overlay click", async () => {
    const user = userEvent.setup();
    render(
      <EditProjectModal
        open={true}
        project={project}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );
    const overlay = document.querySelector(".modal-overlay")!;
    await user.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });
});
