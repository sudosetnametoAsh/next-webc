import { AuthRepository } from "../repository/auth-repository";

export class ClearAzureSession {
    constructor(private repository: AuthRepository) {}

    async execute () {
        return await this.repository.clearAzureSession();
    }
}
