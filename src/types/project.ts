export enum ProjectStatus {
  ACTIVE = "active",
  ARCHIVED = "archived",
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  status: ProjectStatus;
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
}

export type UpdateProject = Partial<NewProject>;
