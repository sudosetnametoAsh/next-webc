const routes: Record<string, string> = {
  Admin: "/admin",
  Staff: "/department/dashboard",
  Student: "/student",
};

export class RoleRouter {
  static resolvePath(role: string, defaultPath: string) {
    if (defaultPath === "/" && role && routes[role]) {
      return routes[role];
    }
    return defaultPath;
  }
}
