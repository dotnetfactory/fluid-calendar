export enum ProjectStatus {
  ACTIVE = "active",
  ON_HOLD = "on_hold",
  ARCHIVED = "archived",
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  status: ProjectStatus;
  scheduleId?: string | null;
  areaId?: string | null;
  area?: { color?: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    tasks: number;
  };
  onClose?: () => void;
}

export interface NewProject {
  name: string;
  description?: string;
  color?: string;
  status?: ProjectStatus;
  scheduleId?: string;
  areaId?: string;
}

export type UpdateProject = Partial<NewProject>;
