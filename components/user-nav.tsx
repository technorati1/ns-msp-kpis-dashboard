import { auth, signOut } from '@/auth';
import { isSettingsAllowed } from '@/lib/settings-auth';
import { Settings } from 'lucide-react';

export async function UserNav() {
  const session = await auth();
  if (!session?.user) return null;

  const { name, email, image } = session.user;
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : (email?.[0] ?? '?').toUpperCase();

  return (
    <div className="flex items-center gap-3">
      {isSettingsAllowed(email) && (
        <a
          href="/settings"
          title="Settings"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
        </a>
      )}

      <div className="hidden sm:block text-right">
        <p className="text-xs font-medium text-zinc-700 leading-tight">{name ?? email}</p>
        {name && <p className="text-xs text-zinc-400 leading-tight">{email}</p>}
      </div>

      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name ?? 'User'} className="h-8 w-8 rounded-full" />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">
          {initials}
        </div>
      )}

      <form
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/sign-in' });
        }}
      >
        <button
          type="submit"
          className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
          title="Sign out"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
