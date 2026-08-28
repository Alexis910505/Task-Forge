// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'TaskForge';

  @override
  String get loginSubtitle => 'Sign in to continue';

  @override
  String get loginWelcomeTitle => 'Welcome back';

  @override
  String get loginWelcomeSubtitle =>
      'Enter your details to access your workspace';

  @override
  String get loginEmailPlaceholder => 'name@company.com';

  @override
  String get dashboardHello => 'Hello';

  @override
  String dashboardHelloName(String name) {
    return 'Hello, $name';
  }

  @override
  String get dashboardTagline =>
      'Here\'s an overview of your operational status today.';

  @override
  String get dashboardUrgentTitle => 'Urgent Tasks';

  @override
  String get dashboardUrgentCta => 'View critical list';

  @override
  String get dashboardAssignedTitle => 'Assigned to Me';

  @override
  String get dashboardAssignedCta => 'Review active tasks';

  @override
  String get dashboardOutputTitle => 'Weekly Output';

  @override
  String dashboardOutputTrend(String value) {
    return '+$value%';
  }

  @override
  String get dashboardSeeAll => 'See all';

  @override
  String get dashboardCriticalBadge => 'CRITICAL';

  @override
  String get emailLabel => 'Email';

  @override
  String get passwordLabel => 'Password';

  @override
  String get firstNameLabel => 'First name';

  @override
  String get lastNameLabel => 'Last name';

  @override
  String get registerPasswordLabel => 'Password (min. 8)';

  @override
  String get submitRegister => 'Create account';

  @override
  String get submitLogin => 'Sign in';

  @override
  String get loginKeepSignedInTitle => 'Keep me signed in';

  @override
  String get loginKeepSignedInSubtitle =>
      'Securely stores your session on this device. Your password is not saved.';

  @override
  String get genericRequestError => 'Could not complete the request';

  @override
  String get navWork => 'Work';

  @override
  String get navDashboard => 'Dashboard';

  @override
  String get navKanban => 'Kanban';

  @override
  String get navMyTasks => 'List';

  @override
  String get navAssets => 'Assets';

  @override
  String get navAlerts => 'Alerts';

  @override
  String get navReports => 'Reports';

  @override
  String get navSettings => 'Settings';

  @override
  String get navOrganization => 'Organization';

  @override
  String get navProfile => 'Profile';

  @override
  String get profileSubtitle => 'Your account in this organization.';

  @override
  String get profileRoleLabel => 'Role';

  @override
  String get navRailHome => 'Work';

  @override
  String get navRailTasks => 'Tasks';

  @override
  String get navRailReports => 'Reports';

  @override
  String get navRailSettings => 'Settings';

  @override
  String get navRailOrgShort => 'Org.';

  @override
  String get drawerBrand => 'TaskForge';

  @override
  String get drawerAccountSection => 'Account';

  @override
  String get syncPendingTooltip => 'Pending changes or photos to sync';

  @override
  String get signOut => 'Sign out';

  @override
  String get settingsTitle => 'Settings';

  @override
  String get settingsWorkspaceTitle => 'Workspace Settings';

  @override
  String get settingsWorkspaceSubtitle =>
      'Manage your team\'s operational environment and global preferences.';

  @override
  String get settingsTabWorkspace => 'Workspace';

  @override
  String get settingsTabNotifications => 'Notifications';

  @override
  String get settingsTabSecurity => 'Security & SSO';

  @override
  String get settingsTabApi => 'API & webhooks';

  @override
  String get settingsGeneralInfo => 'General Information';

  @override
  String get settingsEditInfo => 'Edit Info';

  @override
  String get settingsWorkspaceName => 'Workspace Name';

  @override
  String get settingsWorkspaceUrl => 'Workspace URL';

  @override
  String get settingsTimezone => 'Timezone';

  @override
  String get settingsLogoSection => 'Logo & Icon';

  @override
  String get settingsLogoHint =>
      'PNG, JPG, WEBP or SVG. Logo up to 5 MB; icon up to 1 MB.';

  @override
  String get settingsUploadLogo => 'Upload logo';

  @override
  String get settingsUploadIcon => 'Upload icon';

  @override
  String get settingsUploading => 'Uploading…';

  @override
  String get settingsBrandingUploadFailed => 'Could not upload image';

  @override
  String get settingsEmailPreferences => 'Email Preferences';

  @override
  String get settingsTaskEscalations => 'Task Escalations';

  @override
  String get settingsTaskEscalationsDesc =>
      'Notify when high-priority tasks are overdue.';

  @override
  String get settingsWeeklyAnalytics => 'Weekly Analytics';

  @override
  String get settingsWeeklyAnalyticsDesc =>
      'Receive a summary of fleet and asset performance.';

  @override
  String get settingsDeploymentAlerts => 'Deployment Alerts';

  @override
  String get settingsDeploymentAlertsDesc =>
      'Alerts for personnel deployment status changes.';

  @override
  String get settingsSsoTitle => 'Single Sign-On (SSO)';

  @override
  String get settingsSsoDesc =>
      'Enforce SAML or OAuth authentication for all workspace members.';

  @override
  String get settingsConfigureSso => 'Configure SSO';

  @override
  String get settingsFeature2fa => '2FA Mandatory';

  @override
  String get settingsFeatureRotation => '90-Day Rotation';

  @override
  String get settingsFeatureIp => 'IP Whitelisting';

  @override
  String get settingsSecuritySoon =>
      'SSO and IP whitelisting will be available in a future release.';

  @override
  String get settingsApiTitle => 'API & webhooks';

  @override
  String get settingsApiDesc =>
      'Generate keys to integrate TaskForge with your systems.';

  @override
  String get settingsGenerateKey => 'Generate API key';

  @override
  String get settingsApiSoon => 'API key management coming soon.';

  @override
  String get settingsLanguage => 'Language';

  @override
  String get settingsLanguageSectionDesc =>
      'Choose English or Spanish. Saved on this device.';

  @override
  String get settingsLanguageEnglish => 'English';

  @override
  String get settingsLanguageSpanish => 'Spanish';

  @override
  String get settingsSave => 'Save';

  @override
  String get settingsCancel => 'Cancel';

  @override
  String get settingsSaving => 'Saving…';

  @override
  String get settingsSaveFailed => 'Could not save settings';

  @override
  String get settingsReadOnlyHint =>
      'Only admins and managers can change these settings.';

  @override
  String get settingsLoadFailed => 'Could not load organization settings';

  @override
  String get settingsNoOrgAccess => 'Your role cannot view workspace settings.';

  @override
  String get dashboardSummary => 'Summary';

  @override
  String get dashboardRetry => 'Retry';

  @override
  String get dashboardOfflineBanner =>
      'Offline or network error. Showing the last summary saved on this device.';

  @override
  String get dashboardRefresh => 'Refresh';

  @override
  String get dashboardActiveUsers => 'Active users';

  @override
  String get dashboardTotalTasks => 'Total tasks';

  @override
  String get dashboardOverdue => 'Overdue';

  @override
  String get dashboardByStatus => 'By status';

  @override
  String get dashboardRecentTasks => 'Recent tasks';

  @override
  String get dashboardRecentActivity => 'Recent Activity';

  @override
  String get dashboardQuickAction => 'Quick action';

  @override
  String activity_task_created(String task) {
    return 'New task: $task';
  }

  @override
  String activity_task_assigned(String user, String task) {
    return '$user assigned to $task';
  }

  @override
  String activity_task_status_changed(String task) {
    return 'Status updated on $task';
  }

  @override
  String activity_task_completed(String task) {
    return 'Task completed: $task';
  }

  @override
  String activity_comment_added(String user, String task) {
    return '$user commented on $task';
  }

  @override
  String activity_attachment_added(String user, String task) {
    return '$user uploaded evidence to $task';
  }

  @override
  String get myTasksTitle => 'My tasks';

  @override
  String get myTasksSubtitle => 'All projects · mine and for everyone';

  @override
  String get myTasksSearchHint => 'Search tasks, IDs, or assets…';

  @override
  String get myTasksTabAll => 'All';

  @override
  String get myTasksTabTodo => 'To Do';

  @override
  String get myTasksTabInProgress => 'In Progress';

  @override
  String get myTasksTabCompleted => 'Done';

  @override
  String myTasksCompletedOn(String date) {
    return 'Completed $date';
  }

  @override
  String get myTasksEmpty => 'No tasks for you or unassigned';

  @override
  String get myTasksForEveryone => 'For everyone';

  @override
  String get myTasksNewTask => 'New task';

  @override
  String get myTasksNewTaskSoon => 'Create task coming soon';

  @override
  String get myTasksDueTomorrow => 'Due tomorrow';

  @override
  String myTasksDueToday(String time) {
    return 'Due today, $time';
  }

  @override
  String myTasksOverdueHours(int hours) {
    return 'Overdue by ${hours}h';
  }

  @override
  String myTasksOverdueDays(int days) {
    return 'Overdue by ${days}d';
  }

  @override
  String get myTasksSortTitle => 'Sort tasks';

  @override
  String get myTasksSortByProject => 'By project';

  @override
  String get myTasksSortByPriority => 'By priority';

  @override
  String get myTasksSortByDueSoon => 'By time (due soonest)';

  @override
  String get myTasksSortByDueLatest => 'By time (due latest)';

  @override
  String get reportsTitle => 'Reports';

  @override
  String get reportsDashboardTitle => 'Reporting Dashboard';

  @override
  String get reportsDashboardSubtitle =>
      'Live operational metrics and sync status';

  @override
  String get reportsExportReport => 'Export Report';

  @override
  String get reportsEfficiencyLabel => 'Efficiency %';

  @override
  String get reportsTasksCompletedLabel => 'Tasks Completed';

  @override
  String get reportsAvgTimeLabel => 'Avg Time';

  @override
  String reportsEfficiencyTrendUp(String value) {
    return '+$value% vs last week';
  }

  @override
  String reportsEfficiencyTrendDown(String value) {
    return '$value% vs last week';
  }

  @override
  String reportsTasksTarget(int count) {
    return 'Target: $count units';
  }

  @override
  String reportsAvgTimeDelay(int minutes) {
    return '+${minutes}m delay detected';
  }

  @override
  String get reportsDeptPerformance => 'Department Performance';

  @override
  String reportsCapacity(int percent) {
    return '$percent% Capacity';
  }

  @override
  String get reportsSyncQueue => 'Sync Queue';

  @override
  String get reportsForceSync => 'Force Sync Now';

  @override
  String get reportsSyncOffline => 'Offline: sync when connection returns';

  @override
  String get reportsSyncDone => 'Queue empty: everything synced';

  @override
  String get reportsSystemHealth => 'System Health';

  @override
  String get reportsNetworkStable => 'Network Stable';

  @override
  String get reportsNetworkOffline => 'Offline';

  @override
  String reportsLastBackup(int minutes) {
    return 'Last local backup $minutes min ago';
  }

  @override
  String get reportsNoDeptData => 'No department data for this period';

  @override
  String get reportsExportPdf => 'PDF Document';

  @override
  String get reportsExportPdfHint => 'High-fidelity printable format';

  @override
  String get reportsExportExcel => 'Excel Spreadsheet';

  @override
  String get reportsExportExcelHint => 'Raw data for analysis';

  @override
  String get reportsExportCycleNote =>
      'Export includes data for the current period.';

  @override
  String get reportsExportSaved => 'Report saved to app documents';

  @override
  String get reportsExportFailed => 'Could not export report';

  @override
  String get reportsCompleted7d => 'Completed (7d)';

  @override
  String get reportsAvgTime => 'Average time';

  @override
  String get reportsOpenOverdue => 'Open overdue';

  @override
  String get reportsExportHint =>
      'PDF / Excel export will connect to the Nest `reports` module.';

  @override
  String get orgTitle => 'Organization';

  @override
  String get orgDiscoverabilityTitle => 'QUICK LINKS';

  @override
  String get orgKanbanHint => 'Open board view for your team';

  @override
  String get orgAssetsHint => 'Browse fleet and equipment inventory';

  @override
  String get orgCurrentSection => 'CURRENT ORGANIZATION';

  @override
  String get orgPlanDemo => 'Enterprise plan';

  @override
  String get orgChangeSection => 'SWITCH ORGANIZATION';

  @override
  String get orgAcme => 'Acme Logistics';

  @override
  String get orgInvitePending => 'Invitation pending';

  @override
  String get orgDemoName => 'TaskForge Demo';

  @override
  String get kanbanOfflineSaved =>
      'Offline: change saved on device; will sync when back online.';

  @override
  String kanbanMoveFailed(String error) {
    return 'Could not move task: $error';
  }

  @override
  String get kanbanBoardId => 'Board ID';

  @override
  String get kanbanLoad => 'Load';

  @override
  String get kanbanCachedTitle => 'Cached data';

  @override
  String get kanbanCachedSubtitle =>
      'Last local copy of the board. Connect to refresh.';

  @override
  String get kanbanLoadHint => 'Paste board id';

  @override
  String get kanbanEmptyState =>
      'Load a board to see columns from Backlog to Completed.';

  @override
  String get kanbanBoardIdRequired => 'Enter a board id';

  @override
  String get kanbanEvidenceTooltip => 'Photo evidence';

  @override
  String taskDetailTaskId(String id) {
    return 'Task ID: $id';
  }

  @override
  String get taskDetailChangeStatus => 'Change status';

  @override
  String get taskDetailDescription => 'Description';

  @override
  String get taskDetailNoDescription => 'No description';

  @override
  String get taskDetailAddEvidence => 'Add photo evidence';

  @override
  String get taskDetailEvidenceGallery => 'Evidence gallery';

  @override
  String taskDetailPhotosCount(int count) {
    return '$count photos';
  }

  @override
  String get taskDetailNoPhotos => 'No evidence photos yet';

  @override
  String get taskDetailCommentHint => 'Add a quick comment…';

  @override
  String get taskDetailCommentFailed => 'Could not send comment';

  @override
  String get taskDetailComments => 'Comments';

  @override
  String get taskDetailNoComments => 'No comments yet';

  @override
  String get taskDetailCommentSent => 'Comment posted';

  @override
  String get taskDetailStatusUpdated => 'Status updated';

  @override
  String get taskDetailStatusBacklog => 'Backlog';

  @override
  String get taskDetailStatusTodo => 'To do';

  @override
  String get taskDetailStatusInProgress => 'In progress';

  @override
  String get taskDetailStatusReview => 'In review';

  @override
  String get taskDetailStatusCompleted => 'Completed';

  @override
  String get taskDetailSubtasks => 'Subtasks';

  @override
  String taskDetailSubtasksProgress(int completed, int total) {
    return '$completed of $total completed';
  }

  @override
  String get taskDetailNoSubtasks => 'No subtasks yet';

  @override
  String get taskDetailAddSubtask => 'Add subtask';

  @override
  String get taskDetailSubtaskHint => 'Subtask title';

  @override
  String get taskDetailSubtaskTodo => 'To do';

  @override
  String get taskDetailSubtaskDone => 'Done';

  @override
  String get taskDetailCannotCompleteWithOpenSubtasks =>
      'You can\'t mark the task as completed while there are open subtasks';

  @override
  String get taskDetailParentTask => 'Parent task';

  @override
  String get taskDetailActivityLog => 'Activity log';

  @override
  String get taskActivityLogTitle => 'Activity Log';

  @override
  String taskActivityProject(String name) {
    return 'Project: $name';
  }

  @override
  String get taskActivityEmpty => 'No activity recorded for this task yet.';

  @override
  String taskActivityStatusChangedTo(String status) {
    return 'Changed status to $status';
  }

  @override
  String taskActivityAssignedTo(String name) {
    return 'Assigned $name to this task.';
  }

  @override
  String taskActivityPhotosUploaded(int count) {
    return 'Uploaded $count inspection photos';
  }

  @override
  String get assetsHubTitle => 'Fleet & Equipment';

  @override
  String get assetsHubSubtitle =>
      'Inventory hub for vehicles, tools and machinery.';

  @override
  String get assetsSearchHint => 'Search assets by name or code…';

  @override
  String get assetsFilterAll => 'All Assets';

  @override
  String get assetsSectionTitle => 'Fleet & Equipment';

  @override
  String get assetsEmptyTitle => 'No assets yet';

  @override
  String get assetsEmptyHint =>
      'Register equipment, vehicles and tools to track maintenance and tasks.';

  @override
  String get assetsCreateTitle => 'New asset';

  @override
  String get assetsCreateSubmit => 'Create';

  @override
  String get assetsCreateSuccess => 'Asset created';

  @override
  String get assetsCreateValidation => 'Name and code are required';

  @override
  String get assetsFieldName => 'Name';

  @override
  String get assetsFieldCode => 'Code';

  @override
  String get assetsFieldCategory => 'Category';

  @override
  String get assetsFieldStatus => 'Status';

  @override
  String get assetsFieldLocation => 'Location';

  @override
  String get assetsFieldMaintenance => 'Next maintenance';

  @override
  String get assetsSaveChanges => 'Save changes';

  @override
  String get assetsUpdateSuccess => 'Asset updated';

  @override
  String get assetsCatalogLoadFailed => 'Could not load categories or statuses';

  @override
  String get assetDetailTitle => 'Asset Detail';

  @override
  String get assetDetailStatus => 'Status';

  @override
  String get assetDetailCategory => 'Category';

  @override
  String get assetDetailLocation => 'Location';

  @override
  String get assetDetailNextService => 'Next Service';

  @override
  String get assetDetailLinkedTasks => 'Associated Tasks';

  @override
  String assetDetailOpenTasks(int count) {
    return '$count OPEN';
  }

  @override
  String get assetDetailHistory => 'Maintenance History';

  @override
  String get assetDetailNoHistory => 'No maintenance history recorded yet.';

  @override
  String get assetDetailEdit => 'Edit asset';

  @override
  String get assetDetailEditSoon => 'Asset editing coming soon';

  @override
  String get assetStatusActive => 'Active';

  @override
  String get assetStatusMaintenance => 'Maintenance';

  @override
  String get assetStatusOffline => 'Offline';

  @override
  String get assetStatusRetired => 'Retired';

  @override
  String get assetStatusReserved => 'Reserved';

  @override
  String get assetCategoryVehicles => 'Vehicles';

  @override
  String get assetCategoryTools => 'Tools';

  @override
  String get assetCategoryMachinery => 'Machinery';

  @override
  String get assetCategoryEquipment => 'Equipment';

  @override
  String get assetCategoryHvac => 'HVAC';

  @override
  String get assetCategoryElectrical => 'Electrical';

  @override
  String get assetCategoryBuilding => 'Building';

  @override
  String get assetCategoryRoom => 'Room';

  @override
  String get assetCategoryOther => 'Other';

  @override
  String get assetHistoryCreated => 'Asset created';

  @override
  String get assetHistoryUpdated => 'Asset updated';

  @override
  String get assetHistoryPhotoAdded => 'Photo added';

  @override
  String get assetHistoryPhotoRemoved => 'Photo removed';

  @override
  String get assetHistoryLinkedTask => 'Linked to task';

  @override
  String get assetHistoryUnlinkedTask => 'Unlinked from task';

  @override
  String get profilePerformanceTitle => 'Performance summary';

  @override
  String get profileLast30Days => 'Last 30 days';

  @override
  String get profileEfficiencyRating => 'Efficiency rating';

  @override
  String get profileTasksDone => 'Tasks done';

  @override
  String get profileAvgTime => 'Avg. time';

  @override
  String profileTrendUp(String value) {
    return '+$value%';
  }

  @override
  String get profileMySettings => 'My settings';

  @override
  String get profileHelpSupport => 'Help & support';

  @override
  String get profileSecurityPrivacy => 'Security & privacy';

  @override
  String get profileComingSoon => 'Coming soon';

  @override
  String get profileRoleAdmin => 'Administrator';

  @override
  String get profileRoleDeptHead => 'Department head';

  @override
  String get profileRoleSupervisor => 'Supervisor';

  @override
  String get profileRoleTeamLead => 'Team lead';

  @override
  String get profileRoleManager => 'Team lead';

  @override
  String get profileRoleWorker => 'Field technician';

  @override
  String get profileRoleInspector => 'Inspector';

  @override
  String get profileRoleViewer => 'View only';

  @override
  String get profileNoDepartment => 'Operations';

  @override
  String profileHoursUnit(String hours) {
    return '${hours}h';
  }

  @override
  String get notificationsTitle => 'Notifications';

  @override
  String get notificationsSubtitle => 'Stay updated with your team\'s progress';

  @override
  String get notificationsEmpty => 'No notifications';

  @override
  String get notificationsEmptyHint =>
      'When you\'re assigned tasks or mentioned, they\'ll show up here.';

  @override
  String get notificationsMarkAllRead => 'Mark all as read';

  @override
  String get notificationsMarkingAll => 'Marking…';

  @override
  String get notificationsSectionNewAlerts => 'New alerts';

  @override
  String notificationsSectionYesterday(String date) {
    return 'Yesterday · $date';
  }

  @override
  String get notificationsSectionEarlier => 'Earlier';

  @override
  String get notificationsViewDetails => 'View details';

  @override
  String get notificationsDismiss => 'Dismiss';

  @override
  String get notificationsStatusChanged => 'Status updated:';

  @override
  String notificationsThreadLabel(String name) {
    return 'Thread: $name';
  }

  @override
  String get notificationsTypeTaskAssigned => 'New task assigned';

  @override
  String get notificationsTypeTaskUpdated => 'Task update';

  @override
  String get notificationsTypeComment => 'Comment';

  @override
  String get notificationsTypeMention => 'Mention';

  @override
  String get notificationsTypeSystem => 'System notice';

  @override
  String get createTaskTitle => 'New Task';

  @override
  String get createTaskOfflineBadge => 'OFFLINE';

  @override
  String get createTaskFieldTitle => 'Task title';

  @override
  String get createTaskTitleHint => 'e.g. Hydraulic pump inspection';

  @override
  String get createTaskTitleRequired => 'Title is required';

  @override
  String get createTaskFieldCategory => 'Category';

  @override
  String get createTaskCategoryMaintenance => 'Maintenance';

  @override
  String get createTaskCategoryRepair => 'Repair';

  @override
  String get createTaskCategorySafety => 'Safety';

  @override
  String get createTaskCategoryAudit => 'Audit';

  @override
  String get createTaskFieldAsset => 'Asset / location';

  @override
  String get createTaskAssetHint => 'Search asset or location…';

  @override
  String get createTaskFieldPriority => 'Priority';

  @override
  String get createTaskPriorityLow => 'Low';

  @override
  String get createTaskPriorityMedium => 'Medium';

  @override
  String get createTaskPriorityUrgent => 'Urgent';

  @override
  String get createTaskFieldPhotos => 'Photo evidence';

  @override
  String get createTaskAddPhoto => 'Add photo';

  @override
  String get createTaskPhotosHint => 'Up to 4 photos · uploads when synced';

  @override
  String get createTaskOfflineFooter =>
      'Working offline: task will sync when connected';

  @override
  String get createTaskSave => 'Save task';

  @override
  String get createTaskSavedOnline => 'Task created on server';

  @override
  String get createTaskSavedOffline =>
      'Task saved locally; will sync when online';

  @override
  String get createTaskBoardRequired =>
      'Open Kanban online once to load a board';
}
