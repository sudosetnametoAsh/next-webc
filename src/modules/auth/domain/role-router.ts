const routes: Record<string, string> = {
  Admin: "/admin/dashboard",
  Department: "/department/dashboard",
  Staff: "/department/dashboard",
  Student: "/student",
  Client: "/student",
};

export class RoleRouter {
  static resolvePath(role: string, defaultPath: string) {
    if (!role) return defaultPath;
    
    // Normalize role string
    const normalized = Object.keys(routes).find(
      (k) => k.toLowerCase() === role.toLowerCase()
    );

    if (normalized && routes[normalized]) {
      return routes[normalized];
    }

    return defaultPath;
  }
}
