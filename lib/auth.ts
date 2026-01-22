import { cookies } from 'next/headers';

const AUTH_COOKIE = 'app_authenticated';
const AUTH_DURATION = 24 * 60 * 60 * 1000;

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE);
  return authCookie?.value === 'true';
}

export async function setAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: AUTH_DURATION,
    path: '/',
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}

export function verifyPassword(password: string): boolean {
  return password === process.env.APP_PASSWORD;
}
