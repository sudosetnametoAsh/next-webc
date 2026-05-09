import { AuthCallback } from "@/modules/auth/application/use-case/auth-callback";
import { SupabaseAuthRepository } from "@/modules/auth/infrastructure/supabase-auth-repository";

export function makeAuthCallback () {
    const repository = new SupabaseAuthRepository();
    return new AuthCallback(repository);
}
