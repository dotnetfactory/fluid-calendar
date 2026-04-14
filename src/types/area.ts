export interface Area {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  scheduleId: string | null;
  schedule?: { id: string; name: string; color: string | null } | null;
  _count?: { projects: number };
  createdAt: string;
  updatedAt: string;
}

export interface NewArea {
  name: string;
  icon?: string;
  color?: string;
  scheduleId?: string;
}

export type UpdateArea = Partial<NewArea>;
