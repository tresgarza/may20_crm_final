// Menú principal
{
  id: "main",
  items: [
    {
      label: "Dashboard",
      path: "/",
      icon: "dashboard",
      requiredPermission: "view_dashboard"
    },
    {
      label: "Aplicaciones",
      path: "/applications",
      icon: "apps",
      requiredPermission: "view_applications"
    },
    {
      label: "Clientes",
      path: "/clients",
      icon: "people",
      requiredPermission: "view_clients"
    },
    {
      label: "Empresas",
      path: "/companies",
      icon: "business",
      requiredPermission: "view_companies"
    },
    {
      label: "Kanban",
      path: "/kanban",
      icon: "view_column",
      requiredPermission: "view_kanban"
    },
    {
      label: "Mensajes",
      path: "/messages",
      icon: "chat",
      requiredPermission: "view_messages"
    },
    {
      label: "Reportes",
      path: "/reports",
      icon: "analytics",
      requiredPermission: "view_reports"
    }
  ]
}, 