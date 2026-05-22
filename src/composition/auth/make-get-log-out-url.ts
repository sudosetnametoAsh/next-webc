import { ClearAzureSession } from "@/modules/auth/application/use-case/clear-azure-session";
import { SupabaseAuthRepository } from "@/modules/auth/infrastructure/supabase-auth-repository";

export function makeGetLogOutUrl() {
    const repository = new SupabaseAuthRepository();
    return new ClearAzureSession(repository);

}
