// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class AppLocalizationsEs extends AppLocalizations {
  AppLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get appTitle => 'TaskForge';

  @override
  String get loginSubtitle => 'Inicia sesión para continuar';

  @override
  String get loginWelcomeTitle => 'Bienvenido de nuevo';

  @override
  String get loginWelcomeSubtitle =>
      'Introduce tus datos para acceder al espacio de trabajo';

  @override
  String get loginEmailPlaceholder => 'nombre@empresa.com';

  @override
  String get dashboardHello => 'Hola';

  @override
  String dashboardHelloName(String name) {
    return 'Hola, $name';
  }

  @override
  String get dashboardTagline => 'Resumen del estado de tu operación hoy.';

  @override
  String get dashboardUrgentTitle => 'Tareas urgentes';

  @override
  String get dashboardUrgentCta => 'Ver lista crítica';

  @override
  String get dashboardAssignedTitle => 'Asignadas a mí';

  @override
  String get dashboardAssignedCta => 'Revisar tareas activas';

  @override
  String get dashboardOutputTitle => 'Producción semanal';

  @override
  String dashboardOutputTrend(String value) {
    return '+$value%';
  }

  @override
  String get dashboardSeeAll => 'Ver todo';

  @override
  String get dashboardCriticalBadge => 'CRÍTICO';

  @override
  String get emailLabel => 'Correo';

  @override
  String get passwordLabel => 'Contraseña';

  @override
  String get firstNameLabel => 'Nombre';

  @override
  String get lastNameLabel => 'Apellido';

  @override
  String get registerPasswordLabel => 'Contraseña (mín. 8)';

  @override
  String get submitRegister => 'Crear cuenta';

  @override
  String get submitLogin => 'Entrar';

  @override
  String get loginKeepSignedInTitle => 'Mantener la sesión iniciada';

  @override
  String get loginKeepSignedInSubtitle =>
      'Guarda el acceso de forma segura en el dispositivo. La contraseña no se almacena.';

  @override
  String get genericRequestError => 'No se pudo completar la solicitud';

  @override
  String get navWork => 'Trabajo';

  @override
  String get navDashboard => 'Panel';

  @override
  String get navKanban => 'Kanban';

  @override
  String get navMyTasks => 'Lista';

  @override
  String get navAssets => 'Activos';

  @override
  String get navAlerts => 'Alertas';

  @override
  String get navReports => 'Reportes';

  @override
  String get navSettings => 'Ajustes';

  @override
  String get navOrganization => 'Organización';

  @override
  String get navProfile => 'Perfil';

  @override
  String get profileSubtitle => 'Tu cuenta en esta organización.';

  @override
  String get profileRoleLabel => 'Rol';

  @override
  String get navRailHome => 'Trabajo';

  @override
  String get navRailTasks => 'Tareas';

  @override
  String get navRailReports => 'Reportes';

  @override
  String get navRailSettings => 'Ajustes';

  @override
  String get navRailOrgShort => 'Org.';

  @override
  String get drawerBrand => 'TaskForge';

  @override
  String get drawerAccountSection => 'Cuenta';

  @override
  String get syncPendingTooltip => 'Cambios o fotos pendientes de sincronizar';

  @override
  String get signOut => 'Salir';

  @override
  String get settingsTitle => 'Ajustes';

  @override
  String get settingsWorkspaceTitle => 'Ajustes del espacio de trabajo';

  @override
  String get settingsWorkspaceSubtitle =>
      'Gestiona el entorno operativo de tu equipo y las preferencias globales.';

  @override
  String get settingsTabWorkspace => 'Espacio de trabajo';

  @override
  String get settingsTabNotifications => 'Notificaciones';

  @override
  String get settingsTabSecurity => 'Seguridad y SSO';

  @override
  String get settingsTabApi => 'API y webhooks';

  @override
  String get settingsGeneralInfo => 'Información general';

  @override
  String get settingsEditInfo => 'Editar datos';

  @override
  String get settingsWorkspaceName => 'Nombre del espacio';

  @override
  String get settingsWorkspaceUrl => 'URL del espacio';

  @override
  String get settingsTimezone => 'Zona horaria';

  @override
  String get settingsLogoSection => 'Logo e icono';

  @override
  String get settingsLogoHint =>
      'PNG, JPG, WEBP o SVG. Logo hasta 5 MB; icono hasta 1 MB.';

  @override
  String get settingsUploadLogo => 'Subir logo';

  @override
  String get settingsUploadIcon => 'Subir icono';

  @override
  String get settingsUploading => 'Subiendo…';

  @override
  String get settingsBrandingUploadFailed => 'No se pudo subir la imagen';

  @override
  String get settingsEmailPreferences => 'Preferencias de correo';

  @override
  String get settingsTaskEscalations => 'Escalado de tareas';

  @override
  String get settingsTaskEscalationsDesc =>
      'Avisar cuando tareas de alta prioridad estén vencidas.';

  @override
  String get settingsWeeklyAnalytics => 'Analítica semanal';

  @override
  String get settingsWeeklyAnalyticsDesc =>
      'Resumen de rendimiento de flota y activos.';

  @override
  String get settingsDeploymentAlerts => 'Alertas de despliegue';

  @override
  String get settingsDeploymentAlertsDesc =>
      'Cambios en el estado de despliegue del personal.';

  @override
  String get settingsSsoTitle => 'Inicio de sesión único (SSO)';

  @override
  String get settingsSsoDesc =>
      'Exige autenticación SAML u OAuth para todos los miembros.';

  @override
  String get settingsConfigureSso => 'Configurar SSO';

  @override
  String get settingsFeature2fa => '2FA obligatorio';

  @override
  String get settingsFeatureRotation => 'Rotación 90 días';

  @override
  String get settingsFeatureIp => 'Lista blanca IP';

  @override
  String get settingsSecuritySoon =>
      'SSO e IP whitelisting estarán disponibles en una próxima versión.';

  @override
  String get settingsApiTitle => 'API y webhooks';

  @override
  String get settingsApiDesc =>
      'Genera claves para integrar TaskForge con tus sistemas.';

  @override
  String get settingsGenerateKey => 'Generar clave API';

  @override
  String get settingsApiSoon => 'Gestión de claves API próximamente.';

  @override
  String get settingsLanguage => 'Idioma';

  @override
  String get settingsLanguageSectionDesc =>
      'Elige inglés o español. Se guarda en este dispositivo.';

  @override
  String get settingsLanguageEnglish => 'Inglés';

  @override
  String get settingsLanguageSpanish => 'Español';

  @override
  String get settingsSave => 'Guardar';

  @override
  String get settingsCancel => 'Cancelar';

  @override
  String get settingsSaving => 'Guardando…';

  @override
  String get settingsSaveFailed => 'No se pudieron guardar los ajustes';

  @override
  String get settingsReadOnlyHint =>
      'Solo administradores y managers pueden modificar estos ajustes.';

  @override
  String get settingsLoadFailed =>
      'No se pudieron cargar los ajustes de la organización';

  @override
  String get settingsNoOrgAccess =>
      'Tu rol no puede ver la configuración del espacio de trabajo.';

  @override
  String get dashboardSummary => 'Resumen';

  @override
  String get dashboardRetry => 'Reintentar';

  @override
  String get dashboardOfflineBanner =>
      'Sin conexión o error de red. Mostrando el último resumen guardado en el dispositivo.';

  @override
  String get dashboardRefresh => 'Actualizar';

  @override
  String get dashboardActiveUsers => 'Usuarios activos';

  @override
  String get dashboardTotalTasks => 'Tareas totales';

  @override
  String get dashboardOverdue => 'Vencidas';

  @override
  String get dashboardByStatus => 'Estados';

  @override
  String get dashboardRecentTasks => 'Tareas recientes';

  @override
  String get dashboardRecentActivity => 'Actividad reciente';

  @override
  String get dashboardQuickAction => 'Acción rápida';

  @override
  String activity_task_created(String task) {
    return 'Nueva tarea: $task';
  }

  @override
  String activity_task_assigned(String user, String task) {
    return '$user fue asignado a $task';
  }

  @override
  String activity_task_status_changed(String task) {
    return 'Estado actualizado en $task';
  }

  @override
  String activity_task_completed(String task) {
    return 'Tarea completada: $task';
  }

  @override
  String activity_comment_added(String user, String task) {
    return '$user comentó en $task';
  }

  @override
  String activity_attachment_added(String user, String task) {
    return '$user subió evidencia a $task';
  }

  @override
  String get myTasksTitle => 'Mis tareas';

  @override
  String get myTasksSubtitle => 'Todos los proyectos · mías y para todos';

  @override
  String get myTasksSearchHint => 'Buscar tareas, IDs o activos…';

  @override
  String get myTasksTabAll => 'Todas';

  @override
  String get myTasksTabTodo => 'Por hacer';

  @override
  String get myTasksTabInProgress => 'En curso';

  @override
  String get myTasksTabCompleted => 'Terminadas';

  @override
  String myTasksCompletedOn(String date) {
    return 'Completada $date';
  }

  @override
  String get myTasksEmpty => 'No hay tareas para ti ni sin asignar';

  @override
  String get myTasksForEveryone => 'Para todos';

  @override
  String get myTasksNewTask => 'Nueva tarea';

  @override
  String get myTasksNewTaskSoon => 'Crear tarea estará disponible pronto';

  @override
  String get myTasksDueTomorrow => 'Vence mañana';

  @override
  String myTasksDueToday(String time) {
    return 'Hoy, $time';
  }

  @override
  String myTasksOverdueHours(int hours) {
    return 'Vencida hace ${hours}h';
  }

  @override
  String myTasksOverdueDays(int days) {
    return 'Vencida hace ${days}d';
  }

  @override
  String get myTasksSortTitle => 'Ordenar tareas';

  @override
  String get myTasksSortByProject => 'Por proyecto';

  @override
  String get myTasksSortByPriority => 'Por criticidad';

  @override
  String get myTasksSortByDueSoon => 'Por tiempo (vence antes)';

  @override
  String get myTasksSortByDueLatest => 'Por tiempo (vence después)';

  @override
  String get reportsTitle => 'Reportes';

  @override
  String get reportsDashboardTitle => 'Panel de reportes';

  @override
  String get reportsDashboardSubtitle =>
      'Métricas operativas y estado de sincronización';

  @override
  String get reportsExportReport => 'Exportar informe';

  @override
  String get reportsEfficiencyLabel => 'Eficiencia %';

  @override
  String get reportsTasksCompletedLabel => 'Tareas completadas';

  @override
  String get reportsAvgTimeLabel => 'Tiempo medio';

  @override
  String reportsEfficiencyTrendUp(String value) {
    return '+$value% vs semana anterior';
  }

  @override
  String reportsEfficiencyTrendDown(String value) {
    return '$value% vs semana anterior';
  }

  @override
  String reportsTasksTarget(int count) {
    return 'Objetivo: $count unidades';
  }

  @override
  String reportsAvgTimeDelay(int minutes) {
    return '+${minutes}m de retraso detectado';
  }

  @override
  String get reportsDeptPerformance => 'Rendimiento por departamento';

  @override
  String reportsCapacity(int percent) {
    return '$percent% capacidad';
  }

  @override
  String get reportsSyncQueue => 'Cola de sincronización';

  @override
  String get reportsForceSync => 'Forzar sincronización';

  @override
  String get reportsSyncOffline =>
      'Sin conexión: sincroniza cuando vuelva la red';

  @override
  String get reportsSyncDone => 'Cola vacía: todo sincronizado';

  @override
  String get reportsSystemHealth => 'Estado del sistema';

  @override
  String get reportsNetworkStable => 'Red estable';

  @override
  String get reportsNetworkOffline => 'Sin conexión';

  @override
  String reportsLastBackup(int minutes) {
    return 'Última copia local hace $minutes min';
  }

  @override
  String get reportsNoDeptData => 'Sin datos de departamentos en este periodo';

  @override
  String get reportsExportPdf => 'Documento PDF';

  @override
  String get reportsExportPdfHint => 'Formato imprimible de alta fidelidad';

  @override
  String get reportsExportExcel => 'Hoja Excel';

  @override
  String get reportsExportExcelHint => 'Datos en bruto para análisis';

  @override
  String get reportsExportCycleNote =>
      'La exportación incluye datos del periodo actual.';

  @override
  String get reportsExportSaved => 'Informe guardado en documentos de la app';

  @override
  String get reportsExportFailed => 'No se pudo exportar el informe';

  @override
  String get reportsCompleted7d => 'Completadas (7d)';

  @override
  String get reportsAvgTime => 'Tiempo medio';

  @override
  String get reportsOpenOverdue => 'Vencidas abiertas';

  @override
  String get reportsExportHint =>
      'La exportación PDF / Excel se conectará al módulo Nest `reports`.';

  @override
  String get orgTitle => 'Organización';

  @override
  String get orgDiscoverabilityTitle => 'ACCESOS RÁPIDOS';

  @override
  String get orgKanbanHint => 'Abre la vista de tablero de tu equipo';

  @override
  String get orgAssetsHint => 'Explora el inventario de flota y equipos';

  @override
  String get orgCurrentSection => 'ORGANIZACIÓN ACTUAL';

  @override
  String get orgPlanDemo => 'Plan Enterprise';

  @override
  String get orgChangeSection => 'CAMBIAR ORGANIZACIÓN';

  @override
  String get orgAcme => 'Acme Logistics';

  @override
  String get orgInvitePending => 'Invitación pendiente';

  @override
  String get orgDemoName => 'TaskForge Demo';

  @override
  String get kanbanOfflineSaved =>
      'Sin conexión: cambio guardado en el dispositivo; se sincronizará al recuperar la red.';

  @override
  String kanbanMoveFailed(String error) {
    return 'No se pudo mover la tarea: $error';
  }

  @override
  String get kanbanBoardId => 'ID del tablero';

  @override
  String get kanbanLoad => 'Cargar';

  @override
  String get kanbanCachedTitle => 'Datos en caché';

  @override
  String get kanbanCachedSubtitle =>
      'Última copia local del tablero. Conecta para actualizar.';

  @override
  String get kanbanLoadHint => 'Pega el id del tablero';

  @override
  String get kanbanEmptyState =>
      'Carga un tablero para ver columnas de Por planificar a Terminada.';

  @override
  String get kanbanBoardIdRequired => 'Indica un id de tablero';

  @override
  String get kanbanEvidenceTooltip => 'Evidencia fotográfica';

  @override
  String taskDetailTaskId(String id) {
    return 'ID de tarea: $id';
  }

  @override
  String get taskDetailChangeStatus => 'Cambiar estado';

  @override
  String get taskDetailDescription => 'Descripción';

  @override
  String get taskDetailNoDescription => 'Sin descripción';

  @override
  String get taskDetailAddEvidence => 'Añadir evidencia fotográfica';

  @override
  String get taskDetailEvidenceGallery => 'Galería de evidencias';

  @override
  String taskDetailPhotosCount(int count) {
    return '$count fotos';
  }

  @override
  String get taskDetailNoPhotos => 'Aún no hay fotos de evidencia';

  @override
  String get taskDetailCommentHint => 'Añade un comentario rápido…';

  @override
  String get taskDetailCommentFailed => 'No se pudo enviar el comentario';

  @override
  String get taskDetailComments => 'Comentarios';

  @override
  String get taskDetailNoComments => 'Aún no hay comentarios';

  @override
  String get taskDetailCommentSent => 'Comentario publicado';

  @override
  String get taskDetailStatusUpdated => 'Estado actualizado';

  @override
  String get taskDetailStatusBacklog => 'Por planificar';

  @override
  String get taskDetailStatusTodo => 'Por hacer';

  @override
  String get taskDetailStatusInProgress => 'En curso';

  @override
  String get taskDetailStatusReview => 'En revisión';

  @override
  String get taskDetailStatusCompleted => 'Terminada';

  @override
  String get taskDetailSubtasks => 'Subtareas';

  @override
  String taskDetailSubtasksProgress(int completed, int total) {
    return '$completed de $total completadas';
  }

  @override
  String get taskDetailNoSubtasks => 'Sin subtareas';

  @override
  String get taskDetailAddSubtask => 'Añadir subtarea';

  @override
  String get taskDetailSubtaskHint => 'Título de la subtarea';

  @override
  String get taskDetailSubtaskTodo => 'Por hacer';

  @override
  String get taskDetailSubtaskDone => 'Hecho';

  @override
  String get taskDetailCannotCompleteWithOpenSubtasks =>
      'No puedes marcar la tarea como terminada mientras haya subtareas pendientes';

  @override
  String get taskDetailParentTask => 'Tarea padre';

  @override
  String get taskDetailActivityLog => 'Registro de actividad';

  @override
  String get taskActivityLogTitle => 'Registro de actividad';

  @override
  String taskActivityProject(String name) {
    return 'Proyecto: $name';
  }

  @override
  String get taskActivityEmpty =>
      'Aún no hay actividad registrada en esta tarea.';

  @override
  String taskActivityStatusChangedTo(String status) {
    return 'Cambió el estado a $status';
  }

  @override
  String taskActivityAssignedTo(String name) {
    return 'Asignó a $name en esta tarea.';
  }

  @override
  String taskActivityPhotosUploaded(int count) {
    return 'Subió $count fotos de inspección';
  }

  @override
  String get assetsHubTitle => 'Flota y equipos';

  @override
  String get assetsHubSubtitle =>
      'Centro de inventario de vehículos, herramientas y maquinaria.';

  @override
  String get assetsSearchHint => 'Buscar activos por nombre o código…';

  @override
  String get assetsFilterAll => 'Todos';

  @override
  String get assetsSectionTitle => 'Flota y equipos';

  @override
  String get assetsEmptyTitle => 'Sin activos';

  @override
  String get assetsEmptyHint =>
      'Registra equipos, vehículos y herramientas para seguir mantenimiento y tareas.';

  @override
  String get assetsCreateTitle => 'Nuevo activo';

  @override
  String get assetsCreateSubmit => 'Crear';

  @override
  String get assetsCreateSuccess => 'Activo creado';

  @override
  String get assetsCreateValidation => 'Nombre y código son obligatorios';

  @override
  String get assetsFieldName => 'Nombre';

  @override
  String get assetsFieldCode => 'Código';

  @override
  String get assetsFieldCategory => 'Categoría';

  @override
  String get assetsFieldStatus => 'Estado';

  @override
  String get assetsFieldLocation => 'Ubicación';

  @override
  String get assetsFieldMaintenance => 'Próximo mantenimiento';

  @override
  String get assetsSaveChanges => 'Guardar cambios';

  @override
  String get assetsUpdateSuccess => 'Activo actualizado';

  @override
  String get assetsCatalogLoadFailed =>
      'No se pudieron cargar categorías o estados';

  @override
  String get assetDetailTitle => 'Detalle del activo';

  @override
  String get assetDetailStatus => 'Estado';

  @override
  String get assetDetailCategory => 'Categoría';

  @override
  String get assetDetailLocation => 'Ubicación';

  @override
  String get assetDetailNextService => 'Próximo servicio';

  @override
  String get assetDetailLinkedTasks => 'Tareas asociadas';

  @override
  String assetDetailOpenTasks(int count) {
    return '$count ABIERTAS';
  }

  @override
  String get assetDetailHistory => 'Historial de mantenimiento';

  @override
  String get assetDetailNoHistory => 'Aún no hay historial de mantenimiento.';

  @override
  String get assetDetailEdit => 'Editar activo';

  @override
  String get assetDetailEditSoon =>
      'La edición de activos estará disponible pronto';

  @override
  String get assetStatusActive => 'Activo';

  @override
  String get assetStatusMaintenance => 'Mantenimiento';

  @override
  String get assetStatusOffline => 'Fuera de línea';

  @override
  String get assetStatusRetired => 'Retirado';

  @override
  String get assetStatusReserved => 'Reservado';

  @override
  String get assetCategoryVehicles => 'Vehículos';

  @override
  String get assetCategoryTools => 'Herramientas';

  @override
  String get assetCategoryMachinery => 'Maquinaria';

  @override
  String get assetCategoryEquipment => 'Equipos';

  @override
  String get assetCategoryHvac => 'HVAC';

  @override
  String get assetCategoryElectrical => 'Eléctrico';

  @override
  String get assetCategoryBuilding => 'Edificio';

  @override
  String get assetCategoryRoom => 'Sala';

  @override
  String get assetCategoryOther => 'Otro';

  @override
  String get assetHistoryCreated => 'Activo creado';

  @override
  String get assetHistoryUpdated => 'Activo actualizado';

  @override
  String get assetHistoryPhotoAdded => 'Foto añadida';

  @override
  String get assetHistoryPhotoRemoved => 'Foto eliminada';

  @override
  String get assetHistoryLinkedTask => 'Vinculado a tarea';

  @override
  String get assetHistoryUnlinkedTask => 'Desvinculado de tarea';

  @override
  String get profilePerformanceTitle => 'Resumen de rendimiento';

  @override
  String get profileLast30Days => 'Últimos 30 días';

  @override
  String get profileEfficiencyRating => 'Índice de eficiencia';

  @override
  String get profileTasksDone => 'Tareas hechas';

  @override
  String get profileAvgTime => 'Tiempo medio';

  @override
  String profileTrendUp(String value) {
    return '+$value%';
  }

  @override
  String get profileMySettings => 'Mis ajustes';

  @override
  String get profileHelpSupport => 'Ayuda y soporte';

  @override
  String get profileSecurityPrivacy => 'Seguridad y privacidad';

  @override
  String get profileComingSoon => 'Disponible próximamente';

  @override
  String get profileRoleAdmin => 'Administrador';

  @override
  String get profileRoleDeptHead => 'Jefe de departamento';

  @override
  String get profileRoleSupervisor => 'Supervisor';

  @override
  String get profileRoleTeamLead => 'Jefe de equipo';

  @override
  String get profileRoleManager => 'Responsable de equipo';

  @override
  String get profileRoleWorker => 'Técnico de campo';

  @override
  String get profileRoleInspector => 'Inspector';

  @override
  String get profileRoleViewer => 'Solo lectura';

  @override
  String get profileNoDepartment => 'Operaciones';

  @override
  String profileHoursUnit(String hours) {
    return '${hours}h';
  }

  @override
  String get notificationsTitle => 'Notificaciones';

  @override
  String get notificationsSubtitle =>
      'Mantente al día del progreso de tu equipo';

  @override
  String get notificationsEmpty => 'Sin notificaciones';

  @override
  String get notificationsEmptyHint =>
      'Cuando te asignen tareas o comenten, aparecerán aquí.';

  @override
  String get notificationsMarkAllRead => 'Marcar todo como leído';

  @override
  String get notificationsMarkingAll => 'Marcando…';

  @override
  String get notificationsSectionNewAlerts => 'Alertas nuevas';

  @override
  String notificationsSectionYesterday(String date) {
    return 'Ayer · $date';
  }

  @override
  String get notificationsSectionEarlier => 'Anteriores';

  @override
  String get notificationsViewDetails => 'Ver detalle';

  @override
  String get notificationsDismiss => 'Descartar';

  @override
  String get notificationsStatusChanged => 'Estado actualizado:';

  @override
  String notificationsThreadLabel(String name) {
    return 'Hilo: $name';
  }

  @override
  String get notificationsTypeTaskAssigned => 'Nueva tarea asignada';

  @override
  String get notificationsTypeTaskUpdated => 'Actualización de tarea';

  @override
  String get notificationsTypeComment => 'Comentario';

  @override
  String get notificationsTypeMention => 'Mención';

  @override
  String get notificationsTypeSystem => 'Aviso del sistema';

  @override
  String get createTaskTitle => 'Nueva tarea';

  @override
  String get createTaskOfflineBadge => 'SIN CONEXIÓN';

  @override
  String get createTaskFieldTitle => 'Título de la tarea';

  @override
  String get createTaskTitleHint => 'p. ej. Revisión de bomba hidráulica';

  @override
  String get createTaskTitleRequired => 'El título es obligatorio';

  @override
  String get createTaskFieldCategory => 'Categoría';

  @override
  String get createTaskCategoryMaintenance => 'Mantenimiento';

  @override
  String get createTaskCategoryRepair => 'Reparación';

  @override
  String get createTaskCategorySafety => 'Seguridad';

  @override
  String get createTaskCategoryAudit => 'Auditoría';

  @override
  String get createTaskFieldAsset => 'Activo / ubicación';

  @override
  String get createTaskAssetHint => 'Buscar activo o ubicación…';

  @override
  String get createTaskFieldPriority => 'Prioridad';

  @override
  String get createTaskPriorityLow => 'Baja';

  @override
  String get createTaskPriorityMedium => 'Media';

  @override
  String get createTaskPriorityUrgent => 'Urgente';

  @override
  String get createTaskFieldPhotos => 'Evidencia fotográfica';

  @override
  String get createTaskAddPhoto => 'Añadir foto';

  @override
  String get createTaskPhotosHint =>
      'Hasta 4 fotos · se subirán al sincronizar';

  @override
  String get createTaskOfflineFooter =>
      'Sin conexión: la tarea se sincronizará al reconectar';

  @override
  String get createTaskSave => 'Guardar tarea';

  @override
  String get createTaskSavedOnline => 'Tarea creada en el servidor';

  @override
  String get createTaskSavedOffline =>
      'Tarea guardada localmente; se sincronizará al conectar';

  @override
  String get createTaskBoardRequired =>
      'Abre Kanban con conexión al menos una vez para elegir tablero';
}
