import { AuthSurface } from "@/components/auth/AuthSurface";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return <AuthSurface mode="sign-up" />;
}
