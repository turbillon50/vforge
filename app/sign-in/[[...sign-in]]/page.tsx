import { AuthSurface } from "@/components/auth/AuthSurface";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return <AuthSurface mode="sign-in" />;
}
