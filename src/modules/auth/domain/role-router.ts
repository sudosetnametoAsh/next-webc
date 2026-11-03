const routes = {
  Admin: "/admin",
  Department: "/department/dashboard",
  Client: "/clearance",
} as const;

export type AppRole = keyof typeof routes;

const inArea = (path: string, area: string) =>
  path === area || path.startsWith(area + "/");

export class RoleRouter {
  static resolvePath(role: string, defaultPath: string) {
    if (defaultPath === "/" && Object.hasOwn(routes, role)) {
      return routes[role as AppRole];
    }
    return defaultPath;
  }

  static parseRoles(value: unknown): AppRole[] {
    return Array.isArray(value)
      ? value.filter((role): role is AppRole =>
          typeof role === "string" && Object.hasOwn(routes, role))
      : [];
  }

  static homePath(roles: AppRole[]): string {
    return roles.length ? routes[roles[0]] : "/";
  }

  static canAccess(path: string, roles: AppRole[]): boolean {
    // Notifications are shared by all three interfaces despite the API prefix.
    if (path === "/api/student/notifications") return roles.length > 0;
    if (inArea(path, "/admin") || inArea(path, "/api/admin")) {
      return roles.includes("Admin");
    }
    if (inArea(path, "/department") || inArea(path, "/api/department") || path === "/api/dashboard") {
      return roles.includes("Department");
    }
    if (inArea(path, "/clearance") || inArea(path, "/api/student")) {
      // Department officers also use this area for their own staff clearance.
      return roles.includes("Client") || roles.includes("Department");
    }
    return roles.length > 0;
  }
}
