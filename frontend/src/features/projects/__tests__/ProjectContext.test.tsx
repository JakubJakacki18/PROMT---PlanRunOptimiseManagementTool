/**
 * Unit tests for ProjectContext and ProjectProvider.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { useProject } from "../context/ProjectContext";
import ProjectProvider from "../context/ProjectProvider";
import type { Project } from "../../types/project";

const mockProject: Project = {
  id: 1,
  name: "Test Project",
  description: "Description",
  status: "active",
  start_date: "2026-01-01",
  end_date: "2026-12-31",
  funding_ids: [10, 20],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  owner: 5,
};

describe("useProject", () => {
  it("throws when used outside ProjectProvider", () => {
    expect(() => {
      renderHook(() => useProject());
    }).toThrow("useProject must be used within <ProjectProvider>");
  });

  it("returns project when inside ProjectProvider", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProjectProvider project={mockProject}>{children}</ProjectProvider>
    );

    const { result } = renderHook(() => useProject(), { wrapper });
    expect(result.current).toEqual(mockProject);
  });

  it("returned project has correct name", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProjectProvider project={mockProject}>{children}</ProjectProvider>
    );

    const { result } = renderHook(() => useProject(), { wrapper });
    expect(result.current.name).toBe("Test Project");
  });
});

describe("ProjectProvider", () => {
  it("provides project to deeply nested consumers", () => {
    function DeepChild() {
      const project = useProject();
      return <span data-testid="deep">{project.name}</span>;
    }

    render(
      <ProjectProvider project={mockProject}>
        <div>
          <div>
            <DeepChild />
          </div>
        </div>
      </ProjectProvider>
    );

    expect(screen.getByTestId("deep")).toHaveTextContent("Test Project");
  });
});
