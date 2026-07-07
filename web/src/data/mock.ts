/** Datos estáticos para maquetar vistas (sustituir por API Nest). */

export const mockUser = {
  name: 'Alex Rivera',
  role: 'Ops Lead',
  email: 'alex@taskforge.io',
};

export const mockDepartments = [
  {
    id: '1',
    name: 'Logistics',
    description: 'Fleet and supply chain management',
    icon: 'local_shipping' as const,
    status: 'ACTIVE' as const,
    teamCount: 18,
    activeTasks: 42,
    manager: 'James Dalton',
    managerInitials: 'JD',
  },
  {
    id: '2',
    name: 'Maintenance',
    description: 'Equipment and facility upkeep',
    icon: 'build' as const,
    status: 'ACTIVE' as const,
    teamCount: 12,
    activeTasks: 24,
    manager: 'Sarah Rivera',
    managerInitials: 'SR',
  },
  {
    id: '3',
    name: 'Field Service',
    description: 'On-site technical operations',
    icon: 'engineering' as const,
    status: 'ACTIVE' as const,
    teamCount: 31,
    activeTasks: 89,
    manager: 'Marcus Kane',
    managerInitials: 'MK',
  },
  {
    id: '4',
    name: 'Compliance',
    description: 'Regulatory and safety standards',
    icon: 'verified_user' as const,
    status: 'REVIEW' as const,
    teamCount: 6,
    activeTasks: 11,
    manager: 'Linda Chen',
    managerInitials: 'LC',
  },
  {
    id: '5',
    name: 'Procurement',
    description: 'Asset acquisition and vendor relations',
    icon: 'shopping_cart' as const,
    status: 'ACTIVE' as const,
    teamCount: 9,
    activeTasks: 15,
    manager: 'Arthur Bishop',
    managerInitials: 'AB',
  },
];

export const mockTeams = [
  { id: 't1', name: 'North Sector A', members: 8, openTasks: 14, lead: 'Mila Jensen' },
  { id: 't2', name: 'Field Response Unit', members: 12, openTasks: 31, lead: 'James Dalton' },
  { id: 't3', name: 'Warehouse Ops', members: 15, openTasks: 22, lead: 'Sarah Rivera' },
];

export const mockAssets = [
  { id: 'a1', name: 'HVAC Unit 4', code: 'AST-2201', status: 'Operational', location: 'Building C', dept: 'Maintenance' },
  { id: 'a2', name: 'Fleet Truck 12', code: 'FLT-8812', status: 'In service', location: 'Yard B', dept: 'Logistics' },
  { id: 'a3', name: 'PLC Panel B', code: 'SYS-003', status: 'Maintenance due', location: 'Site B', dept: 'Field Service' },
  { id: 'a4', name: 'Forklift F-04', code: 'EQ-104', status: 'Operational', location: 'Warehouse 3', dept: 'Logistics' },
];

export const mockUsersRoles = [
  { id: 'u1', name: 'Alex Rivera', email: 'alex@taskforge.io', role: 'ADMIN', dept: 'Operations', active: true },
  { id: 'u2', name: 'Mila Jensen', email: 'mila@taskforge.io', role: 'MANAGER', dept: 'Logistics', active: true },
  { id: 'u3', name: 'James Dalton', email: 'james@taskforge.io', role: 'INSPECTOR', dept: 'Field Service', active: true },
  { id: 'u4', name: 'Guest Viewer', email: 'viewer@taskforge.io', role: 'VIEWER', dept: 'Compliance', active: false },
];

export type KanbanTask = {
  id: string;
  title: string;
  category: string;
  priority?: 'Urgent' | 'High' | 'Medium' | 'Low';
  comments?: number;
  attachments?: number;
  date?: string;
  progress?: number;
  timer?: string;
  assignees: number;
};

export const mockKanban: Record<string, KanbanTask[]> = {
  Backlog: [
    {
      id: 'k1',
      title: 'Repair HVAC Unit 4',
      category: 'MAINTENANCE',
      priority: 'Urgent',
      comments: 4,
      attachments: 2,
      assignees: 1,
    },
    {
      id: 'k2',
      title: 'Route optimization for Fleet A',
      category: 'LOGISTICS',
      date: 'Oct 24',
      assignees: 1,
    },
  ],
  'To Do': [
    {
      id: 'k3',
      title: 'Audit Warehouse Section 3',
      category: 'INVENTORY',
      priority: 'High',
      timer: '2d left',
      assignees: 1,
    },
  ],
  'In Progress': [
    {
      id: 'k4',
      title: 'Upgrade PLC Firmware - Site B',
      category: 'SYSTEMS',
      progress: 66,
      timer: '4h active',
      assignees: 2,
    },
  ],
  Review: [
    {
      id: 'k5',
      title: 'Safety checklist Q4',
      category: 'COMPLIANCE',
      priority: 'Medium',
      assignees: 1,
    },
  ],
  Done: [
    { id: 'k6', title: 'Replace conveyor belt S2', category: 'MAINTENANCE', assignees: 1 },
  ],
};

export const mockNotifications = [
  { id: 'n1', title: 'Task assigned', body: 'You were assigned “Site inspection - Sector 7”.', time: '5 min ago', unread: true },
  { id: 'n2', title: 'SLA warning', body: '3 tasks in Logistics are approaching due date.', time: '1 h ago', unread: true },
  { id: 'n3', title: 'Evidence approved', body: 'Maintenance uploaded photos for AST-2201.', time: 'Yesterday', unread: false },
];

export const mockSyncQueue = [
  { id: 's1', action: 'UPDATE_TASK', target: 'k4', status: 'PENDING', when: '2 min ago' },
  { id: 's2', action: 'UPLOAD_ATTACHMENT', target: '7724', status: 'SYNCING', when: 'Just now' },
  { id: 's3', action: 'CREATE_COMMENT', target: 'k1', status: 'DONE', when: '12 min ago' },
];

export const mockTaskDetail = {
  id: '7724',
  title: 'Site inspection - Sector 7',
  status: 'In progress',
  priority: 'High',
  location: 'Sector 7 - Grid A',
  description:
    'Conduct a thorough structural integrity assessment of the Sector 7 storage facility. Evaluate corrosion on primary load-bearing columns (Grid A1-A4) and inspect ventilation systems for debris. Critical priority due to heavy machinery installations next week.',
  evidence: [
    { label: 'Before', alt: 'Warehouse before' },
    { label: 'After (expected / ref)', alt: 'Warehouse after reference' },
  ],
  activity: [
    { who: 'Alex Rivera', what: 'Changed status to In progress', when: 'Today 09:12' },
    { who: 'Mila Jensen', what: 'Added comment on ventilation', when: 'Yesterday 16:40' },
    { who: 'System', what: 'Task created from template INS-01', when: 'Mon 08:00' },
  ],
};

export const mockReportTechnicians = [
  { initials: 'JD', name: 'James D.', dept: 'Logistics', tasks: 142, avgTime: '1.2h', sla: '99.4%' },
  { initials: 'SR', name: 'Sarah R.', dept: 'Maintenance', tasks: 98, avgTime: '2.4h', sla: '97.1%' },
  { initials: 'MK', name: 'Marcus K.', dept: 'Field Service', tasks: 201, avgTime: '3.1h', sla: '94.8%' },
];

export const mockSlaRows = [
  { name: 'Infrastructure', success: 88 },
  { name: 'Field Services', success: 64 },
  { name: 'Logistics', success: 95 },
  { name: 'Fleet Maint', success: 79 },
];

export const dashboardStats = {
  totalTasks: 128,
  inProgress: 42,
  completed: 86,
  urgent: 5,
  totalDelta: '+12% from last week',
  completedHint: '24 in last 48h',
};
