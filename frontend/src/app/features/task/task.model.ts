export interface Task {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  completed: boolean;
  sourceInteractionId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CreateTaskRequest {
  subjectId: string;
  title: string;
  description: string;
  sourceInteractionId?: string;
}
