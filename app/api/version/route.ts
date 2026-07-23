import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    branch: process.env.VERCEL_GIT_COMMIT_REF || 'unknown',
    deployedAt: process.env.VERCEL_GIT_COMMIT_MESSAGE || 'unknown',
  });
}
