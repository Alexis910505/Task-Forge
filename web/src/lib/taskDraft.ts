const DRAFT_KEY = 'tf_create_task_draft';

export type TaskFormDraft = {
  boardId: string;
  title: string;
  description: string;
  priority: string;
  assigneeId: string;
  location: string;
  dueDate: string;
  departmentId: string;
  teamId: string;
  subtasks?: string[];
  savedAt: string;
};

export function loadTaskDraft(): TaskFormDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TaskFormDraft;
  } catch {
    return null;
  }
}

export function saveTaskDraft(draft: Omit<TaskFormDraft, 'savedAt'>): void {
  const payload: TaskFormDraft = { ...draft, savedAt: new Date().toISOString() };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
}

export function clearTaskDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}
