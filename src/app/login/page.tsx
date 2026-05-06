import { AuthorLogin } from "@/components/v2/AuthorLogin";
import { auth } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();

  return <AuthorLogin shouldPersistMatch={Boolean(session?.user?.id)} />;
}
