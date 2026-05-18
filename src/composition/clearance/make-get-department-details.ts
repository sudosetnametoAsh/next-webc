import { createClient } from "@/lib/db/supabase-client";
import { GetDeapartmentDetails } from "@/modules/clearance/application/use-case/get-department-details";
import { SupabaseDepartmentRepository } from "@/modules/clearance/infrastructure/supabase-department-repository";

export function makeGetDepartmentDetails() {
    const supabase = createClient();
    const repository = new SupabaseDepartmentRepository(supabase)
    return new GetDeapartmentDetails(repository)
}
