import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_es.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'gen/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('es'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'TaskForge'**
  String get appTitle;

  /// No description provided for @loginSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in to continue'**
  String get loginSubtitle;

  /// No description provided for @loginWelcomeTitle.
  ///
  /// In en, this message translates to:
  /// **'Welcome back'**
  String get loginWelcomeTitle;

  /// No description provided for @loginWelcomeSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Enter your details to access your workspace'**
  String get loginWelcomeSubtitle;

  /// No description provided for @loginEmailPlaceholder.
  ///
  /// In en, this message translates to:
  /// **'name@company.com'**
  String get loginEmailPlaceholder;

  /// No description provided for @dashboardHello.
  ///
  /// In en, this message translates to:
  /// **'Hello'**
  String get dashboardHello;

  /// No description provided for @dashboardHelloName.
  ///
  /// In en, this message translates to:
  /// **'Hello, {name}'**
  String dashboardHelloName(String name);

  /// No description provided for @dashboardTagline.
  ///
  /// In en, this message translates to:
  /// **'Here\'s an overview of your operational status today.'**
  String get dashboardTagline;

  /// No description provided for @dashboardUrgentTitle.
  ///
  /// In en, this message translates to:
  /// **'Urgent Tasks'**
  String get dashboardUrgentTitle;

  /// No description provided for @dashboardUrgentCta.
  ///
  /// In en, this message translates to:
  /// **'View critical list'**
  String get dashboardUrgentCta;

  /// No description provided for @dashboardAssignedTitle.
  ///
  /// In en, this message translates to:
  /// **'Assigned to Me'**
  String get dashboardAssignedTitle;

  /// No description provided for @dashboardAssignedCta.
  ///
  /// In en, this message translates to:
  /// **'Review active tasks'**
  String get dashboardAssignedCta;

  /// No description provided for @dashboardOutputTitle.
  ///
  /// In en, this message translates to:
  /// **'Weekly Output'**
  String get dashboardOutputTitle;

  /// No description provided for @dashboardOutputTrend.
  ///
  /// In en, this message translates to:
  /// **'+{value}%'**
  String dashboardOutputTrend(String value);

  /// No description provided for @dashboardSeeAll.
  ///
  /// In en, this message translates to:
  /// **'See all'**
  String get dashboardSeeAll;

  /// No description provided for @dashboardCriticalBadge.
  ///
  /// In en, this message translates to:
  /// **'CRITICAL'**
  String get dashboardCriticalBadge;

  /// No description provided for @emailLabel.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get emailLabel;

  /// No description provided for @passwordLabel.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get passwordLabel;

  /// No description provided for @firstNameLabel.
  ///
  /// In en, this message translates to:
  /// **'First name'**
  String get firstNameLabel;

  /// No description provided for @lastNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Last name'**
  String get lastNameLabel;

  /// No description provided for @registerPasswordLabel.
  ///
  /// In en, this message translates to:
  /// **'Password (min. 8)'**
  String get registerPasswordLabel;

  /// No description provided for @submitRegister.
  ///
  /// In en, this message translates to:
  /// **'Create account'**
  String get submitRegister;

  /// No description provided for @submitLogin.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get submitLogin;

  /// No description provided for @loginKeepSignedInTitle.
  ///
  /// In en, this message translates to:
  /// **'Keep me signed in'**
  String get loginKeepSignedInTitle;

  /// No description provided for @loginKeepSignedInSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Securely stores your session on this device. Your password is not saved.'**
  String get loginKeepSignedInSubtitle;

  /// No description provided for @genericRequestError.
  ///
  /// In en, this message translates to:
  /// **'Could not complete the request'**
  String get genericRequestError;

  /// No description provided for @navDashboard.
  ///
  /// In en, this message translates to:
  /// **'Work'**
  String get navDashboard;

  /// No description provided for @navKanban.
  ///
  /// In en, this message translates to:
  /// **'Kanban'**
  String get navKanban;

  /// No description provided for @navMyTasks.
  ///
  /// In en, this message translates to:
  /// **'List'**
  String get navMyTasks;

  /// No description provided for @navReports.
  ///
  /// In en, this message translates to:
  /// **'Reports'**
  String get navReports;

  /// No description provided for @navSettings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get navSettings;

  /// No description provided for @navOrganization.
  ///
  /// In en, this message translates to:
  /// **'Organization'**
  String get navOrganization;

  /// No description provided for @navProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get navProfile;

  /// No description provided for @profileSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Your account in this organization.'**
  String get profileSubtitle;

  /// No description provided for @profileRoleLabel.
  ///
  /// In en, this message translates to:
  /// **'Role'**
  String get profileRoleLabel;

  /// No description provided for @navRailHome.
  ///
  /// In en, this message translates to:
  /// **'Work'**
  String get navRailHome;

  /// No description provided for @navRailTasks.
  ///
  /// In en, this message translates to:
  /// **'Tasks'**
  String get navRailTasks;

  /// No description provided for @navRailReports.
  ///
  /// In en, this message translates to:
  /// **'Reports'**
  String get navRailReports;

  /// No description provided for @navRailSettings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get navRailSettings;

  /// No description provided for @navRailOrgShort.
  ///
  /// In en, this message translates to:
  /// **'Org.'**
  String get navRailOrgShort;

  /// No description provided for @drawerBrand.
  ///
  /// In en, this message translates to:
  /// **'TaskForge'**
  String get drawerBrand;

  /// No description provided for @drawerAccountSection.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get drawerAccountSection;

  /// No description provided for @syncPendingTooltip.
  ///
  /// In en, this message translates to:
  /// **'Pending changes or photos to sync'**
  String get syncPendingTooltip;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get signOut;

  /// No description provided for @settingsTitle.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settingsTitle;

  /// No description provided for @settingsWorkspaceTitle.
  ///
  /// In en, this message translates to:
  /// **'Workspace Settings'**
  String get settingsWorkspaceTitle;

  /// No description provided for @settingsWorkspaceSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Manage your team\'s operational environment and global preferences.'**
  String get settingsWorkspaceSubtitle;

  /// No description provided for @settingsTabWorkspace.
  ///
  /// In en, this message translates to:
  /// **'Workspace'**
  String get settingsTabWorkspace;

  /// No description provided for @settingsTabNotifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get settingsTabNotifications;

  /// No description provided for @settingsTabSecurity.
  ///
  /// In en, this message translates to:
  /// **'Security & SSO'**
  String get settingsTabSecurity;

  /// No description provided for @settingsTabApi.
  ///
  /// In en, this message translates to:
  /// **'API & webhooks'**
  String get settingsTabApi;

  /// No description provided for @settingsGeneralInfo.
  ///
  /// In en, this message translates to:
  /// **'General Information'**
  String get settingsGeneralInfo;

  /// No description provided for @settingsEditInfo.
  ///
  /// In en, this message translates to:
  /// **'Edit Info'**
  String get settingsEditInfo;

  /// No description provided for @settingsWorkspaceName.
  ///
  /// In en, this message translates to:
  /// **'Workspace Name'**
  String get settingsWorkspaceName;

  /// No description provided for @settingsWorkspaceUrl.
  ///
  /// In en, this message translates to:
  /// **'Workspace URL'**
  String get settingsWorkspaceUrl;

  /// No description provided for @settingsTimezone.
  ///
  /// In en, this message translates to:
  /// **'Timezone'**
  String get settingsTimezone;

  /// No description provided for @settingsLogoSection.
  ///
  /// In en, this message translates to:
  /// **'Logo & Icon'**
  String get settingsLogoSection;

  /// No description provided for @settingsLogoHint.
  ///
  /// In en, this message translates to:
  /// **'PNG, JPG, WEBP or SVG. Logo up to 5 MB; icon up to 1 MB.'**
  String get settingsLogoHint;

  /// No description provided for @settingsUploadLogo.
  ///
  /// In en, this message translates to:
  /// **'Upload logo'**
  String get settingsUploadLogo;

  /// No description provided for @settingsUploadIcon.
  ///
  /// In en, this message translates to:
  /// **'Upload icon'**
  String get settingsUploadIcon;

  /// No description provided for @settingsUploading.
  ///
  /// In en, this message translates to:
  /// **'Uploading…'**
  String get settingsUploading;

  /// No description provided for @settingsBrandingUploadFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not upload image'**
  String get settingsBrandingUploadFailed;

  /// No description provided for @settingsEmailPreferences.
  ///
  /// In en, this message translates to:
  /// **'Email Preferences'**
  String get settingsEmailPreferences;

  /// No description provided for @settingsTaskEscalations.
  ///
  /// In en, this message translates to:
  /// **'Task Escalations'**
  String get settingsTaskEscalations;

  /// No description provided for @settingsTaskEscalationsDesc.
  ///
  /// In en, this message translates to:
  /// **'Notify when high-priority tasks are overdue.'**
  String get settingsTaskEscalationsDesc;

  /// No description provided for @settingsWeeklyAnalytics.
  ///
  /// In en, this message translates to:
  /// **'Weekly Analytics'**
  String get settingsWeeklyAnalytics;

  /// No description provided for @settingsWeeklyAnalyticsDesc.
  ///
  /// In en, this message translates to:
  /// **'Receive a summary of fleet and asset performance.'**
  String get settingsWeeklyAnalyticsDesc;

  /// No description provided for @settingsDeploymentAlerts.
  ///
  /// In en, this message translates to:
  /// **'Deployment Alerts'**
  String get settingsDeploymentAlerts;

  /// No description provided for @settingsDeploymentAlertsDesc.
  ///
  /// In en, this message translates to:
  /// **'Alerts for personnel deployment status changes.'**
  String get settingsDeploymentAlertsDesc;

  /// No description provided for @settingsSsoTitle.
  ///
  /// In en, this message translates to:
  /// **'Single Sign-On (SSO)'**
  String get settingsSsoTitle;

  /// No description provided for @settingsSsoDesc.
  ///
  /// In en, this message translates to:
  /// **'Enforce SAML or OAuth authentication for all workspace members.'**
  String get settingsSsoDesc;

  /// No description provided for @settingsConfigureSso.
  ///
  /// In en, this message translates to:
  /// **'Configure SSO'**
  String get settingsConfigureSso;

  /// No description provided for @settingsFeature2fa.
  ///
  /// In en, this message translates to:
  /// **'2FA Mandatory'**
  String get settingsFeature2fa;

  /// No description provided for @settingsFeatureRotation.
  ///
  /// In en, this message translates to:
  /// **'90-Day Rotation'**
  String get settingsFeatureRotation;

  /// No description provided for @settingsFeatureIp.
  ///
  /// In en, this message translates to:
  /// **'IP Whitelisting'**
  String get settingsFeatureIp;

  /// No description provided for @settingsSecuritySoon.
  ///
  /// In en, this message translates to:
  /// **'SSO and IP whitelisting will be available in a future release.'**
  String get settingsSecuritySoon;

  /// No description provided for @settingsApiTitle.
  ///
  /// In en, this message translates to:
  /// **'API & webhooks'**
  String get settingsApiTitle;

  /// No description provided for @settingsApiDesc.
  ///
  /// In en, this message translates to:
  /// **'Generate keys to integrate TaskForge with your systems.'**
  String get settingsApiDesc;

  /// No description provided for @settingsGenerateKey.
  ///
  /// In en, this message translates to:
  /// **'Generate API key'**
  String get settingsGenerateKey;

  /// No description provided for @settingsApiSoon.
  ///
  /// In en, this message translates to:
  /// **'API key management coming soon.'**
  String get settingsApiSoon;

  /// No description provided for @settingsLanguage.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get settingsLanguage;

  /// No description provided for @settingsLanguageSectionDesc.
  ///
  /// In en, this message translates to:
  /// **'Choose English or Spanish. Saved on this device.'**
  String get settingsLanguageSectionDesc;

  /// No description provided for @settingsLanguageEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get settingsLanguageEnglish;

  /// No description provided for @settingsLanguageSpanish.
  ///
  /// In en, this message translates to:
  /// **'Spanish'**
  String get settingsLanguageSpanish;

  /// No description provided for @settingsSave.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get settingsSave;

  /// No description provided for @settingsCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get settingsCancel;

  /// No description provided for @settingsSaving.
  ///
  /// In en, this message translates to:
  /// **'Saving…'**
  String get settingsSaving;

  /// No description provided for @settingsSaveFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not save settings'**
  String get settingsSaveFailed;

  /// No description provided for @settingsReadOnlyHint.
  ///
  /// In en, this message translates to:
  /// **'Only admins and managers can change these settings.'**
  String get settingsReadOnlyHint;

  /// No description provided for @settingsLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not load organization settings'**
  String get settingsLoadFailed;

  /// No description provided for @settingsNoOrgAccess.
  ///
  /// In en, this message translates to:
  /// **'Your role cannot view workspace settings.'**
  String get settingsNoOrgAccess;

  /// No description provided for @dashboardSummary.
  ///
  /// In en, this message translates to:
  /// **'Summary'**
  String get dashboardSummary;

  /// No description provided for @dashboardRetry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get dashboardRetry;

  /// No description provided for @dashboardOfflineBanner.
  ///
  /// In en, this message translates to:
  /// **'Offline or network error. Showing the last summary saved on this device.'**
  String get dashboardOfflineBanner;

  /// No description provided for @dashboardRefresh.
  ///
  /// In en, this message translates to:
  /// **'Refresh'**
  String get dashboardRefresh;

  /// No description provided for @dashboardActiveUsers.
  ///
  /// In en, this message translates to:
  /// **'Active users'**
  String get dashboardActiveUsers;

  /// No description provided for @dashboardTotalTasks.
  ///
  /// In en, this message translates to:
  /// **'Total tasks'**
  String get dashboardTotalTasks;

  /// No description provided for @dashboardOverdue.
  ///
  /// In en, this message translates to:
  /// **'Overdue'**
  String get dashboardOverdue;

  /// No description provided for @dashboardByStatus.
  ///
  /// In en, this message translates to:
  /// **'By status'**
  String get dashboardByStatus;

  /// No description provided for @dashboardRecentTasks.
  ///
  /// In en, this message translates to:
  /// **'Recent tasks'**
  String get dashboardRecentTasks;

  /// No description provided for @dashboardRecentActivity.
  ///
  /// In en, this message translates to:
  /// **'Recent Activity'**
  String get dashboardRecentActivity;

  /// No description provided for @dashboardQuickAction.
  ///
  /// In en, this message translates to:
  /// **'Quick action'**
  String get dashboardQuickAction;

  /// No description provided for @activity_task_created.
  ///
  /// In en, this message translates to:
  /// **'New task: {task}'**
  String activity_task_created(String task);

  /// No description provided for @activity_task_assigned.
  ///
  /// In en, this message translates to:
  /// **'{user} assigned to {task}'**
  String activity_task_assigned(String user, String task);

  /// No description provided for @activity_task_status_changed.
  ///
  /// In en, this message translates to:
  /// **'Status updated on {task}'**
  String activity_task_status_changed(String task);

  /// No description provided for @activity_task_completed.
  ///
  /// In en, this message translates to:
  /// **'Task completed: {task}'**
  String activity_task_completed(String task);

  /// No description provided for @activity_comment_added.
  ///
  /// In en, this message translates to:
  /// **'{user} commented on {task}'**
  String activity_comment_added(String user, String task);

  /// No description provided for @activity_attachment_added.
  ///
  /// In en, this message translates to:
  /// **'{user} uploaded evidence to {task}'**
  String activity_attachment_added(String user, String task);

  /// No description provided for @myTasksTitle.
  ///
  /// In en, this message translates to:
  /// **'My tasks'**
  String get myTasksTitle;

  /// No description provided for @myTasksSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Priority, SLA and board'**
  String get myTasksSubtitle;

  /// No description provided for @myTasksSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search tasks, IDs, or assets…'**
  String get myTasksSearchHint;

  /// No description provided for @myTasksTabAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get myTasksTabAll;

  /// No description provided for @myTasksTabTodo.
  ///
  /// In en, this message translates to:
  /// **'To Do'**
  String get myTasksTabTodo;

  /// No description provided for @myTasksTabInProgress.
  ///
  /// In en, this message translates to:
  /// **'In Progress'**
  String get myTasksTabInProgress;

  /// No description provided for @myTasksTabCompleted.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get myTasksTabCompleted;

  /// No description provided for @myTasksCompletedOn.
  ///
  /// In en, this message translates to:
  /// **'Completed {date}'**
  String myTasksCompletedOn(String date);

  /// No description provided for @myTasksEmpty.
  ///
  /// In en, this message translates to:
  /// **'You have no assigned tasks'**
  String get myTasksEmpty;

  /// No description provided for @myTasksNewTask.
  ///
  /// In en, this message translates to:
  /// **'New task'**
  String get myTasksNewTask;

  /// No description provided for @myTasksNewTaskSoon.
  ///
  /// In en, this message translates to:
  /// **'Create task coming soon'**
  String get myTasksNewTaskSoon;

  /// No description provided for @myTasksDueTomorrow.
  ///
  /// In en, this message translates to:
  /// **'Due tomorrow'**
  String get myTasksDueTomorrow;

  /// No description provided for @myTasksDueToday.
  ///
  /// In en, this message translates to:
  /// **'Due today, {time}'**
  String myTasksDueToday(String time);

  /// No description provided for @myTasksOverdueHours.
  ///
  /// In en, this message translates to:
  /// **'Overdue by {hours}h'**
  String myTasksOverdueHours(int hours);

  /// No description provided for @myTasksOverdueDays.
  ///
  /// In en, this message translates to:
  /// **'Overdue by {days}d'**
  String myTasksOverdueDays(int days);

  /// No description provided for @reportsTitle.
  ///
  /// In en, this message translates to:
  /// **'Reports'**
  String get reportsTitle;

  /// No description provided for @reportsDashboardTitle.
  ///
  /// In en, this message translates to:
  /// **'Reporting Dashboard'**
  String get reportsDashboardTitle;

  /// No description provided for @reportsDashboardSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Live operational metrics and sync status'**
  String get reportsDashboardSubtitle;

  /// No description provided for @reportsExportReport.
  ///
  /// In en, this message translates to:
  /// **'Export Report'**
  String get reportsExportReport;

  /// No description provided for @reportsEfficiencyLabel.
  ///
  /// In en, this message translates to:
  /// **'Efficiency %'**
  String get reportsEfficiencyLabel;

  /// No description provided for @reportsTasksCompletedLabel.
  ///
  /// In en, this message translates to:
  /// **'Tasks Completed'**
  String get reportsTasksCompletedLabel;

  /// No description provided for @reportsAvgTimeLabel.
  ///
  /// In en, this message translates to:
  /// **'Avg Time'**
  String get reportsAvgTimeLabel;

  /// No description provided for @reportsEfficiencyTrendUp.
  ///
  /// In en, this message translates to:
  /// **'+{value}% vs last week'**
  String reportsEfficiencyTrendUp(String value);

  /// No description provided for @reportsEfficiencyTrendDown.
  ///
  /// In en, this message translates to:
  /// **'{value}% vs last week'**
  String reportsEfficiencyTrendDown(String value);

  /// No description provided for @reportsTasksTarget.
  ///
  /// In en, this message translates to:
  /// **'Target: {count} units'**
  String reportsTasksTarget(int count);

  /// No description provided for @reportsAvgTimeDelay.
  ///
  /// In en, this message translates to:
  /// **'+{minutes}m delay detected'**
  String reportsAvgTimeDelay(int minutes);

  /// No description provided for @reportsDeptPerformance.
  ///
  /// In en, this message translates to:
  /// **'Department Performance'**
  String get reportsDeptPerformance;

  /// No description provided for @reportsCapacity.
  ///
  /// In en, this message translates to:
  /// **'{percent}% Capacity'**
  String reportsCapacity(int percent);

  /// No description provided for @reportsSyncQueue.
  ///
  /// In en, this message translates to:
  /// **'Sync Queue'**
  String get reportsSyncQueue;

  /// No description provided for @reportsForceSync.
  ///
  /// In en, this message translates to:
  /// **'Force Sync Now'**
  String get reportsForceSync;

  /// No description provided for @reportsSyncOffline.
  ///
  /// In en, this message translates to:
  /// **'Offline: sync when connection returns'**
  String get reportsSyncOffline;

  /// No description provided for @reportsSyncDone.
  ///
  /// In en, this message translates to:
  /// **'Queue empty: everything synced'**
  String get reportsSyncDone;

  /// No description provided for @reportsSystemHealth.
  ///
  /// In en, this message translates to:
  /// **'System Health'**
  String get reportsSystemHealth;

  /// No description provided for @reportsNetworkStable.
  ///
  /// In en, this message translates to:
  /// **'Network Stable'**
  String get reportsNetworkStable;

  /// No description provided for @reportsNetworkOffline.
  ///
  /// In en, this message translates to:
  /// **'Offline'**
  String get reportsNetworkOffline;

  /// No description provided for @reportsLastBackup.
  ///
  /// In en, this message translates to:
  /// **'Last local backup {minutes} min ago'**
  String reportsLastBackup(int minutes);

  /// No description provided for @reportsNoDeptData.
  ///
  /// In en, this message translates to:
  /// **'No department data for this period'**
  String get reportsNoDeptData;

  /// No description provided for @reportsExportPdf.
  ///
  /// In en, this message translates to:
  /// **'PDF Document'**
  String get reportsExportPdf;

  /// No description provided for @reportsExportPdfHint.
  ///
  /// In en, this message translates to:
  /// **'High-fidelity printable format'**
  String get reportsExportPdfHint;

  /// No description provided for @reportsExportExcel.
  ///
  /// In en, this message translates to:
  /// **'Excel Spreadsheet'**
  String get reportsExportExcel;

  /// No description provided for @reportsExportExcelHint.
  ///
  /// In en, this message translates to:
  /// **'Raw data for analysis'**
  String get reportsExportExcelHint;

  /// No description provided for @reportsExportCycleNote.
  ///
  /// In en, this message translates to:
  /// **'Export includes data for the current period.'**
  String get reportsExportCycleNote;

  /// No description provided for @reportsExportSaved.
  ///
  /// In en, this message translates to:
  /// **'Report saved to app documents'**
  String get reportsExportSaved;

  /// No description provided for @reportsExportFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not export report'**
  String get reportsExportFailed;

  /// No description provided for @reportsCompleted7d.
  ///
  /// In en, this message translates to:
  /// **'Completed (7d)'**
  String get reportsCompleted7d;

  /// No description provided for @reportsAvgTime.
  ///
  /// In en, this message translates to:
  /// **'Average time'**
  String get reportsAvgTime;

  /// No description provided for @reportsOpenOverdue.
  ///
  /// In en, this message translates to:
  /// **'Open overdue'**
  String get reportsOpenOverdue;

  /// No description provided for @reportsExportHint.
  ///
  /// In en, this message translates to:
  /// **'PDF / Excel export will connect to the Nest `reports` module.'**
  String get reportsExportHint;

  /// No description provided for @orgTitle.
  ///
  /// In en, this message translates to:
  /// **'Organization'**
  String get orgTitle;

  /// No description provided for @orgCurrentSection.
  ///
  /// In en, this message translates to:
  /// **'CURRENT ORGANIZATION'**
  String get orgCurrentSection;

  /// No description provided for @orgPlanDemo.
  ///
  /// In en, this message translates to:
  /// **'Enterprise plan'**
  String get orgPlanDemo;

  /// No description provided for @orgChangeSection.
  ///
  /// In en, this message translates to:
  /// **'SWITCH ORGANIZATION'**
  String get orgChangeSection;

  /// No description provided for @orgAcme.
  ///
  /// In en, this message translates to:
  /// **'Acme Logistics'**
  String get orgAcme;

  /// No description provided for @orgInvitePending.
  ///
  /// In en, this message translates to:
  /// **'Invitation pending'**
  String get orgInvitePending;

  /// No description provided for @orgDemoName.
  ///
  /// In en, this message translates to:
  /// **'TaskForge Demo'**
  String get orgDemoName;

  /// No description provided for @kanbanOfflineSaved.
  ///
  /// In en, this message translates to:
  /// **'Offline: change saved on device; will sync when back online.'**
  String get kanbanOfflineSaved;

  /// No description provided for @kanbanMoveFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not move task: {error}'**
  String kanbanMoveFailed(String error);

  /// No description provided for @kanbanBoardId.
  ///
  /// In en, this message translates to:
  /// **'Board ID'**
  String get kanbanBoardId;

  /// No description provided for @kanbanLoad.
  ///
  /// In en, this message translates to:
  /// **'Load'**
  String get kanbanLoad;

  /// No description provided for @kanbanCachedTitle.
  ///
  /// In en, this message translates to:
  /// **'Cached data'**
  String get kanbanCachedTitle;

  /// No description provided for @kanbanCachedSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Last local copy of the board. Connect to refresh.'**
  String get kanbanCachedSubtitle;

  /// No description provided for @kanbanLoadHint.
  ///
  /// In en, this message translates to:
  /// **'Paste board id'**
  String get kanbanLoadHint;

  /// No description provided for @kanbanEmptyState.
  ///
  /// In en, this message translates to:
  /// **'Load a board to see columns from Backlog to Completed.'**
  String get kanbanEmptyState;

  /// No description provided for @kanbanBoardIdRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter a board id'**
  String get kanbanBoardIdRequired;

  /// No description provided for @kanbanEvidenceTooltip.
  ///
  /// In en, this message translates to:
  /// **'Photo evidence'**
  String get kanbanEvidenceTooltip;

  /// No description provided for @taskDetailTaskId.
  ///
  /// In en, this message translates to:
  /// **'Task ID: {id}'**
  String taskDetailTaskId(String id);

  /// No description provided for @taskDetailChangeStatus.
  ///
  /// In en, this message translates to:
  /// **'Change status'**
  String get taskDetailChangeStatus;

  /// No description provided for @taskDetailDescription.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get taskDetailDescription;

  /// No description provided for @taskDetailNoDescription.
  ///
  /// In en, this message translates to:
  /// **'No description'**
  String get taskDetailNoDescription;

  /// No description provided for @taskDetailAddEvidence.
  ///
  /// In en, this message translates to:
  /// **'Add photo evidence'**
  String get taskDetailAddEvidence;

  /// No description provided for @taskDetailEvidenceGallery.
  ///
  /// In en, this message translates to:
  /// **'Evidence gallery'**
  String get taskDetailEvidenceGallery;

  /// No description provided for @taskDetailPhotosCount.
  ///
  /// In en, this message translates to:
  /// **'{count} photos'**
  String taskDetailPhotosCount(int count);

  /// No description provided for @taskDetailNoPhotos.
  ///
  /// In en, this message translates to:
  /// **'No evidence photos yet'**
  String get taskDetailNoPhotos;

  /// No description provided for @taskDetailCommentHint.
  ///
  /// In en, this message translates to:
  /// **'Add a quick comment…'**
  String get taskDetailCommentHint;

  /// No description provided for @taskDetailCommentFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not send comment'**
  String get taskDetailCommentFailed;

  /// No description provided for @taskDetailStatusUpdated.
  ///
  /// In en, this message translates to:
  /// **'Status updated'**
  String get taskDetailStatusUpdated;

  /// No description provided for @taskDetailStatusBacklog.
  ///
  /// In en, this message translates to:
  /// **'Backlog'**
  String get taskDetailStatusBacklog;

  /// No description provided for @taskDetailStatusTodo.
  ///
  /// In en, this message translates to:
  /// **'To do'**
  String get taskDetailStatusTodo;

  /// No description provided for @taskDetailStatusInProgress.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get taskDetailStatusInProgress;

  /// No description provided for @taskDetailStatusReview.
  ///
  /// In en, this message translates to:
  /// **'In review'**
  String get taskDetailStatusReview;

  /// No description provided for @taskDetailStatusCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get taskDetailStatusCompleted;

  /// No description provided for @profilePerformanceTitle.
  ///
  /// In en, this message translates to:
  /// **'Performance summary'**
  String get profilePerformanceTitle;

  /// No description provided for @profileLast30Days.
  ///
  /// In en, this message translates to:
  /// **'Last 30 days'**
  String get profileLast30Days;

  /// No description provided for @profileEfficiencyRating.
  ///
  /// In en, this message translates to:
  /// **'Efficiency rating'**
  String get profileEfficiencyRating;

  /// No description provided for @profileTasksDone.
  ///
  /// In en, this message translates to:
  /// **'Tasks done'**
  String get profileTasksDone;

  /// No description provided for @profileAvgTime.
  ///
  /// In en, this message translates to:
  /// **'Avg. time'**
  String get profileAvgTime;

  /// No description provided for @profileTrendUp.
  ///
  /// In en, this message translates to:
  /// **'+{value}%'**
  String profileTrendUp(String value);

  /// No description provided for @profileMySettings.
  ///
  /// In en, this message translates to:
  /// **'My settings'**
  String get profileMySettings;

  /// No description provided for @profileHelpSupport.
  ///
  /// In en, this message translates to:
  /// **'Help & support'**
  String get profileHelpSupport;

  /// No description provided for @profileSecurityPrivacy.
  ///
  /// In en, this message translates to:
  /// **'Security & privacy'**
  String get profileSecurityPrivacy;

  /// No description provided for @profileComingSoon.
  ///
  /// In en, this message translates to:
  /// **'Coming soon'**
  String get profileComingSoon;

  /// No description provided for @profileRoleAdmin.
  ///
  /// In en, this message translates to:
  /// **'Administrator'**
  String get profileRoleAdmin;

  /// No description provided for @profileRoleManager.
  ///
  /// In en, this message translates to:
  /// **'Team lead'**
  String get profileRoleManager;

  /// No description provided for @profileRoleWorker.
  ///
  /// In en, this message translates to:
  /// **'Field technician'**
  String get profileRoleWorker;

  /// No description provided for @profileRoleInspector.
  ///
  /// In en, this message translates to:
  /// **'Inspector'**
  String get profileRoleInspector;

  /// No description provided for @profileRoleViewer.
  ///
  /// In en, this message translates to:
  /// **'View only'**
  String get profileRoleViewer;

  /// No description provided for @profileNoDepartment.
  ///
  /// In en, this message translates to:
  /// **'Operations'**
  String get profileNoDepartment;

  /// No description provided for @profileHoursUnit.
  ///
  /// In en, this message translates to:
  /// **'{hours}h'**
  String profileHoursUnit(String hours);

  /// No description provided for @notificationsTitle.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notificationsTitle;

  /// No description provided for @notificationsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Stay updated with your team\'s progress'**
  String get notificationsSubtitle;

  /// No description provided for @notificationsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No notifications'**
  String get notificationsEmpty;

  /// No description provided for @notificationsEmptyHint.
  ///
  /// In en, this message translates to:
  /// **'When you\'re assigned tasks or mentioned, they\'ll show up here.'**
  String get notificationsEmptyHint;

  /// No description provided for @notificationsMarkAllRead.
  ///
  /// In en, this message translates to:
  /// **'Mark all as read'**
  String get notificationsMarkAllRead;

  /// No description provided for @notificationsMarkingAll.
  ///
  /// In en, this message translates to:
  /// **'Marking…'**
  String get notificationsMarkingAll;

  /// No description provided for @notificationsSectionNewAlerts.
  ///
  /// In en, this message translates to:
  /// **'New alerts'**
  String get notificationsSectionNewAlerts;

  /// No description provided for @notificationsSectionYesterday.
  ///
  /// In en, this message translates to:
  /// **'Yesterday · {date}'**
  String notificationsSectionYesterday(String date);

  /// No description provided for @notificationsSectionEarlier.
  ///
  /// In en, this message translates to:
  /// **'Earlier'**
  String get notificationsSectionEarlier;

  /// No description provided for @notificationsViewDetails.
  ///
  /// In en, this message translates to:
  /// **'View details'**
  String get notificationsViewDetails;

  /// No description provided for @notificationsDismiss.
  ///
  /// In en, this message translates to:
  /// **'Dismiss'**
  String get notificationsDismiss;

  /// No description provided for @notificationsStatusChanged.
  ///
  /// In en, this message translates to:
  /// **'Status updated:'**
  String get notificationsStatusChanged;

  /// No description provided for @notificationsThreadLabel.
  ///
  /// In en, this message translates to:
  /// **'Thread: {name}'**
  String notificationsThreadLabel(String name);

  /// No description provided for @notificationsTypeTaskAssigned.
  ///
  /// In en, this message translates to:
  /// **'New task assigned'**
  String get notificationsTypeTaskAssigned;

  /// No description provided for @notificationsTypeTaskUpdated.
  ///
  /// In en, this message translates to:
  /// **'Task update'**
  String get notificationsTypeTaskUpdated;

  /// No description provided for @notificationsTypeComment.
  ///
  /// In en, this message translates to:
  /// **'Comment'**
  String get notificationsTypeComment;

  /// No description provided for @notificationsTypeMention.
  ///
  /// In en, this message translates to:
  /// **'Mention'**
  String get notificationsTypeMention;

  /// No description provided for @notificationsTypeSystem.
  ///
  /// In en, this message translates to:
  /// **'System notice'**
  String get notificationsTypeSystem;

  /// No description provided for @createTaskTitle.
  ///
  /// In en, this message translates to:
  /// **'New Task'**
  String get createTaskTitle;

  /// No description provided for @createTaskOfflineBadge.
  ///
  /// In en, this message translates to:
  /// **'OFFLINE'**
  String get createTaskOfflineBadge;

  /// No description provided for @createTaskFieldTitle.
  ///
  /// In en, this message translates to:
  /// **'Task title'**
  String get createTaskFieldTitle;

  /// No description provided for @createTaskTitleHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Hydraulic pump inspection'**
  String get createTaskTitleHint;

  /// No description provided for @createTaskTitleRequired.
  ///
  /// In en, this message translates to:
  /// **'Title is required'**
  String get createTaskTitleRequired;

  /// No description provided for @createTaskFieldCategory.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get createTaskFieldCategory;

  /// No description provided for @createTaskCategoryMaintenance.
  ///
  /// In en, this message translates to:
  /// **'Maintenance'**
  String get createTaskCategoryMaintenance;

  /// No description provided for @createTaskCategoryRepair.
  ///
  /// In en, this message translates to:
  /// **'Repair'**
  String get createTaskCategoryRepair;

  /// No description provided for @createTaskCategorySafety.
  ///
  /// In en, this message translates to:
  /// **'Safety'**
  String get createTaskCategorySafety;

  /// No description provided for @createTaskCategoryAudit.
  ///
  /// In en, this message translates to:
  /// **'Audit'**
  String get createTaskCategoryAudit;

  /// No description provided for @createTaskFieldAsset.
  ///
  /// In en, this message translates to:
  /// **'Asset / location'**
  String get createTaskFieldAsset;

  /// No description provided for @createTaskAssetHint.
  ///
  /// In en, this message translates to:
  /// **'Search asset or location…'**
  String get createTaskAssetHint;

  /// No description provided for @createTaskFieldPriority.
  ///
  /// In en, this message translates to:
  /// **'Priority'**
  String get createTaskFieldPriority;

  /// No description provided for @createTaskPriorityLow.
  ///
  /// In en, this message translates to:
  /// **'Low'**
  String get createTaskPriorityLow;

  /// No description provided for @createTaskPriorityMedium.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get createTaskPriorityMedium;

  /// No description provided for @createTaskPriorityUrgent.
  ///
  /// In en, this message translates to:
  /// **'Urgent'**
  String get createTaskPriorityUrgent;

  /// No description provided for @createTaskFieldPhotos.
  ///
  /// In en, this message translates to:
  /// **'Photo evidence'**
  String get createTaskFieldPhotos;

  /// No description provided for @createTaskAddPhoto.
  ///
  /// In en, this message translates to:
  /// **'Add photo'**
  String get createTaskAddPhoto;

  /// No description provided for @createTaskPhotosHint.
  ///
  /// In en, this message translates to:
  /// **'Up to 4 photos · uploads when synced'**
  String get createTaskPhotosHint;

  /// No description provided for @createTaskOfflineFooter.
  ///
  /// In en, this message translates to:
  /// **'Working offline: task will sync when connected'**
  String get createTaskOfflineFooter;

  /// No description provided for @createTaskSave.
  ///
  /// In en, this message translates to:
  /// **'Save task'**
  String get createTaskSave;

  /// No description provided for @createTaskSavedOnline.
  ///
  /// In en, this message translates to:
  /// **'Task created on server'**
  String get createTaskSavedOnline;

  /// No description provided for @createTaskSavedOffline.
  ///
  /// In en, this message translates to:
  /// **'Task saved locally; will sync when online'**
  String get createTaskSavedOffline;

  /// No description provided for @createTaskBoardRequired.
  ///
  /// In en, this message translates to:
  /// **'Open Kanban online once to load a board'**
  String get createTaskBoardRequired;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'es'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'es':
      return AppLocalizationsEs();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
