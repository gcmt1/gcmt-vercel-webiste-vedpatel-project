// Use the persisted Supabase session across the gateway redirect. Older guests
// may still have a password saved by the previous storefront.
let pending;

async function restoreOrCreate(auth, storage) {
  const current = await auth.getSession();
  if (current.error) throw current.error;
  if (current.data.session) return current.data.session;
  const email = storage.getItem('guest_user_email');
  const password = storage.getItem('guest_user_password');
  if (email && password) {
    const restored = await auth.signInWithPassword({ email, password });
    if (restored.error) throw restored.error;
    return restored.data.session;
  }
  const signup = await auth.signUp({
    email: crypto.randomUUID() + '@guest.local',
    password: crypto.randomUUID(),
  });
  if (signup.error) throw signup.error;
  if (!signup.data.session) throw new Error('Guest checkout needs an active session.');
  return signup.data.session;
}

export function ensureOrderSession(auth, storage) {
  if (!pending) {
    const start = () => restoreOrCreate(auth, storage);
    const locks = navigator.locks;
    pending = (locks ? locks.request('gcmt-start-guest-session', start) : start())
      .finally(() => { pending = undefined; });
  }
  return pending;
}
