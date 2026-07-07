/** ADMIN y MANAGER pueden crear/editar/eliminar proyectos. */
export function canManageProjects(roleName: string | undefined): boolean {
  return roleName === 'ADMIN' || roleName === 'MANAGER';
}

/** VIEWER no puede crear tareas. */
export function canCreateTasks(roleName: string | undefined): boolean {
  return roleName !== 'VIEWER';
}

const STORAGE_KEY = 'tf_selected_project_id';

export function getStoredProjectId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredProjectId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}
