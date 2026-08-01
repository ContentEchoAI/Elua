import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: ['/workspace(.*)', '/(api|trpc)(.*)'],
};