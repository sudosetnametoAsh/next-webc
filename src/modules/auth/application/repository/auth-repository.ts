
export interface AuthRepository {
    exchangeCodeForSession(code: string) : Promise<void>
    getUserRole() : Promise<string>;
    clearAzureSession() : Promise<string>;
}
