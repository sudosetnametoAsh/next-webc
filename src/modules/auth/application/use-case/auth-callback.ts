import { RoleRouter } from "../../domain/role-router";
import { AuthRepository } from "../repository/auth-repository";

export class AuthCallback {
    constructor (private repository: AuthRepository ) {}

    async execute(code: string, nextPath: string)  {
        await this.repository.exchangeCodeForSession(code);

        const role = await this.repository.getUserRole();

        const redirectPath = RoleRouter.resolvePath(role, nextPath);

        return redirectPath;
    }
}
