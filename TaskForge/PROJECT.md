# TaskForge

**SaaS de órdenes de trabajo, Kanban y operaciones en tiempo real**  
*(Work-order & operations SaaS — web + mobile)*

---

## Resumen / Overview

**ES:** TaskForge es una plataforma multi-organización para planificar, asignar y dar seguimiento a tareas operativas. Une un tablero Kanban, dashboard de métricas, equipos, departamentos, activos, reportes y notificaciones en vivo, con la misma API para web y app móvil.

**EN:** TaskForge is a multi-tenant operations platform to plan, assign, and track field/office work. It combines a Kanban board, metrics dashboard, teams, departments, assets, reports, and live notifications — one API powering both the web app and the Flutter mobile client.

---

## Problema que resuelve

Equipos operativos (limpieza, mantenimiento, logística, etc.) necesitan coordinar trabajo entre oficina y campo sin hojas de cálculo ni chats dispersos: prioridades, vencimientos, evidencia, roles y visibilidad en tiempo real.

---

## Funcionalidades principales

- Autenticación JWT (access + refresh) y sesiones por cliente
- Multi-tenant por organización (slug)
- Roles y permisos (Admin, Manager, Worker, Inspector, Viewer)
- Tablero Kanban por proyecto (estados, prioridades, subtareas)
- Detalle de tarea: descripción, asignación, ubicación/mapa, adjuntos, actividad
- Dashboard operativo (métricas, carga por departamento, actividad reciente)
- Equipos, departamentos, usuarios y activos
- Notificaciones en tiempo real (Socket.IO)
- Reportes exportables
- i18n web (EN / ES)
- App móvil Flutter alineada con los mismos flujos

---

## Stack técnico

| Capa | Tecnología |
|------|------------|
| Backend | NestJS 11, Prisma, PostgreSQL, Passport JWT, Socket.IO |
| Web | React 19, Vite, TypeScript, Tailwind CSS, i18next |
| Mobile | Flutter / Dart (GetX, Dio) |
| Infra local | Docker Compose (Postgres), API en Node |

---

## Destacados de ingeniería

- API REST + WebSockets compartidos por web y mobile
- Pool de conexiones Prisma (`connection_limit`) pensado para varios usuarios concurrentes
- Consultas agregadas SQL en dashboard/departamentos (menos N+1 bajo carga)
- Guards de roles/permisos en el backend
- Branding y ajustes por organización
- Capturas de UI en `screenshots/` (interfaz en inglés)

---

## Mi rol

Full-stack: diseño e implementación del backend, web y app móvil, modelo de datos, auth, tiempo real y optimización de consultas.

---

## Capturas

Ver carpeta [`screenshots/`](./screenshots/) e índice en [`screenshots/INDEX.md`](./screenshots/INDEX.md).

| # | Vista |
|---|--------|
| 01 | Login |
| 02 | Dashboard |
| 03 | Activity |
| 04 | Kanban / Task list |
| 05 | Teams |
| 06 | Departments |
| 07 | Assets |
| 08 | Users & roles |
| 09 | Reports |
| 10 | Create task |
| 11 | Notifications |
| 12 | Settings |
| 13–14 | Profile / Edit profile |
| 15 | 404 |
| 16–17 | Task detail / Edit task |

---

## Texto corto para el portafolio (copiar/pegar)

**ES (1 párrafo):**  
TaskForge es un SaaS full-stack de gestión operativa con Kanban, dashboard, roles, activos y notificaciones en tiempo real. Incluye API NestJS + PostgreSQL, cliente web React y app Flutter, pensado para varios usuarios concurrentes en la misma organización.

**EN (1 paragraph):**  
TaskForge is a full-stack operations SaaS with Kanban boards, dashboards, role-based access, asset tracking, and real-time notifications. Built with NestJS, PostgreSQL, React, and Flutter — designed for concurrent multi-user workflows within each organization.

**EN (bullets):**  
- Multi-tenant work-order platform (web + mobile)  
- NestJS / Prisma / PostgreSQL + Socket.IO  
- React + Flutter clients, JWT auth, RBAC  
- Live Kanban, reporting, and operational metrics  
