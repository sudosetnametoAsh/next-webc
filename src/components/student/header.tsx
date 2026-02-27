import SignOutButton from "../auth/sign-out-button";

type Header = {
  initial: string;
  name: string;
  email: string;
};

export default function Header({ initial, name, email }: Header) {
  return (
    <header className="flex h-15 justify-center border-b border-[#E7E5E2] bg-[#FFFFFF] p-2.5">
      <div className="flex h-10 w-[80vw] flex-row">
        <span
          id="initial"
          className="inline-flex h-10 w-10 items-center justify-center rounded-sm bg-[#212D47] text-[18px] font-medium text-[#FFFFFF]"
        >
          {initial}
        </span>

        <div
          id="user-identification"
          className="ml-2 flex flex-col justify-center"
        >
          <span id="name" className="text-[13px] leading-none font-semibold">
            {name}
          </span>
          <span id="email" className="text-[12px] leading-none font-extralight">
            {email}
          </span>
        </div>
      </div>

      <SignOutButton />
    </header>
  );
}
