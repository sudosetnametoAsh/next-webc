import { createClient } from "@/lib/db/supabase-server";
import { AuthRepository } from "../application/repository/auth-repository";
import { InvalidAuthTokenError } from "../application/error";
import { RoleRouter } from "../domain/role-router";

export class SupabaseAuthRepository implements AuthRepository {
  async exchangeCodeForSession(code: string) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth Exchange Error: ", error);
      throw new InvalidAuthTokenError("Invalid Token");
    }
  }

  async getUserRole(): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error(error);
      throw new Error("Failed to retrieve user");
    }

    const role = RoleRouter.parseRoles(data.user?.user_metadata?.custom_claims?.roles)[0];
    if (!role) {
      throw new Error("Authenticated user has no supported Azure app role. Check Entra app role assignments.");
    }

    return role;
  }

  async clearAzureSession(): Promise<string> {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut();

    if (error) {
        throw new Error ("Error occured logging out");
    }

    const redirectUri = encodeURIComponent(process.env.NEXT_PUBLIC_APP_URL!);
    return `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID!}/oauth2/v2.0/logout?post_logout_redirect_uri=${redirectUri}`;
  }
}
