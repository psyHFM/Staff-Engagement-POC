export interface Task {
  id: string;
  subjectId: number;
  title: string;
  description: string;
  completed: boolean;
  sourceInteractionId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CreateTaskRequest {
  subjectId: number;
  title: string;
  description: string;
  sourceInteractionId?: string;
}
