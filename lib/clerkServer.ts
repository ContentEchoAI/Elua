import { auth } from '@clerk/nextjs/server';

export async function getCurrentClerkUserId() {
  const { userId } = await auth();
  return userId;
}
