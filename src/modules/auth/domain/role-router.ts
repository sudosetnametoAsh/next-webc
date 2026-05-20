const routes: Record<string, string> = {
  Admin: "/admin",
  Department: "/department/dashboard",
  Client: "/clearance",
};

export class RoleRouter {
  static resolvePath(role: string, defaultPath: string) {
    if (defaultPath === "/" && role && routes[role]) {
      return routes[role];
    }
    return defaultPath;
  }
}
