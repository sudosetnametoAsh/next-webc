import Landing from "@/components/landing";
import AuthGate from "@/components/auth/auth-gate";

export default async function Home({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
    const notEnrolled = (await searchParams).notice === "not-enrolled";
    return (
        <>
            <AuthGate enrollmentRequired={notEnrolled}>
                <Landing notEnrolled={notEnrolled} />
            </AuthGate>
        </>
    );
}
