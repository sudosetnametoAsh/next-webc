import SignOutButton from "../auth/sign-out-button";

type Header = {
  initial: string;
  name: string;
  email: string;
};

export default function Header({ initial, name, email }: Header) {
  return (
    <header className="flex h-24 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-transparent pt-4">
      <div className="flex items-center gap-4">
        <span
          id="initial"
          className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-800 text-xl font-bold text-white shadow-sm dark:bg-slate-800 dark:ring-1 dark:ring-slate-700"
        >
          {initial}
        </span>

        <div id="user-identification" className="flex flex-col justify-center">
          <span id="name" className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {name} (Student)
          </span>
          <span id="email" className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {email}
          </span>
        </div>
      </div>

      <SignOutButton />
    </header>
  );
}
