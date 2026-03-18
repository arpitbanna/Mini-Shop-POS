'use server';

export async function verifyPassword(password: string) {
  return password === process.env.ADMIN_PASSWORD;
}
