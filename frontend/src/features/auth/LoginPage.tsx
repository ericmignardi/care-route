import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { errorMessage } from "../../api/client";
import { landingPath, useAuthStore } from "../../stores/authStore";
import { loginSchema, type LoginInput } from "../../types/auth";
import { AuthLayout } from "./AuthLayout";

export function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    try {
      await login(values);
      // Where they were headed before the guard intercepted them, if anywhere.
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? landingPath(useAuthStore.getState().user), { replace: true });
    } catch (error) {
      setFormError(errorMessage(error, "Could not sign you in. Try again."));
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      intro="Coordinators schedule the day; caregivers work it. Both start here."
      footer={
        <>
          No account yet?{" "}
          <Link to="/register" className="font-semibold text-pine-acc hover:underline">
            Register as a caregiver
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {formError && (
          <div
            role="alert"
            className="rounded-[5px] border border-mis-bd border-l-4 border-l-mis-fg bg-mis-bg px-3 py-2.5 text-[12.5px] leading-[1.5] font-semibold text-mis-fg"
          >
            {formError}
          </div>
        )}

        <Input
          label="Username"
          autoComplete="username"
          autoFocus
          error={errors.username?.message}
          {...register("username")}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        <Button type="submit" variant="primary" fullWidth loading={isSubmitting} loadingLabel="Signing in">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
