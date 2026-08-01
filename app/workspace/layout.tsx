import { ClerkProvider } from '@clerk/nextjs';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClerkProvider>{children}</ClerkProvider>;
}