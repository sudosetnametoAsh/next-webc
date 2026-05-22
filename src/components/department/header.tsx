import SignOutButton from "../auth/sign-out-button";

export default function Header() {
  return (
    <main className="flex w-[80vw] gap-2 items-center">
      {/* user initial */}
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-black font-medium">
        <span className="text-white text-[18px]">NM</span>
      </div>

      {/* user info */}
      <section className="flex flex-col">
        <span className="leading-none font-semibold text-[13px]">Name here</span>
        <span className="leading-none font-extralight text-[12px]">Email here</span>
      </section>

      <section className="ml-auto">
        <SignOutButton />
      </section>
    </main>
  );
}
