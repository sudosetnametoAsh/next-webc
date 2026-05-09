import { useMsal } from "@azure/msal-react";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";

type Response = {
  role: string[];
};

type Options = Pick<UseQueryOptions<Response>, "enabled" | "retry">;

export function useValidateToken(options: Options) {
  const { instance, accounts } = useMsal();

  return useQuery<Response>({
    queryKey: ["validate-token", accounts?.[0]?.homeAccountId],
    queryFn: async () => {
      const token = await instance.acquireTokenSilent({
        scopes: ["api://5255649e-e023-43ef-afcb-e60ed3f9a32e/User.Read"],
        account: accounts[0],
      });

      console.log("id token: ", token.idTokenClaims);
      console.log("access token: ", token.accessToken);

      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ accessToken: token.accessToken }),
      });

      if (!response.ok) {
        instance.logoutRedirect();
        throw new Error("Token validation failed");
      }

      return response.json();
    },
    enabled: options?.enabled ?? !!accounts?.length,
    retry: options?.retry ?? false,
  });
}
