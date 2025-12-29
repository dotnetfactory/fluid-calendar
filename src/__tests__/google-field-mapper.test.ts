import { GoogleFieldMapper } from "@/lib/task-sync/providers/google-field-mapper";
import { TaskStatus } from "@/types/task";

describe("GoogleFieldMapper", () => {
  it("maps status and due date correctly", () => {
    const mapper = new GoogleFieldMapper();

    const external: import("@/lib/task-sync/providers/task-provider.interface").ExternalTask = {
      id: "t1",
      title: "Buy milk",
      status: "completed",
      description: "Buy milk",
      listId: "list-1",
      dueDate: new Date("2025-01-01T00:00:00.000Z"),
      completedDate: new Date("2025-01-02T12:00:00.000Z"),
    };

    const internal = mapper.mapToInternalTask(external, "proj-1");

    expect(internal.status).toBe(TaskStatus.COMPLETED);
    expect(internal.description).toBe("Buy milk");
    expect(internal.dueDate).toBeInstanceOf(Date);
    expect(internal.completedAt).toBeInstanceOf(Date);
  });
});
