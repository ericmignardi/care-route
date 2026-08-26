import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { authApi } from "../../api/auth";
import { errorMessage, fieldErrors } from "../../api/client";
import { toast } from "../../stores/toastStore";
import { registerSchema, type RegisterInput } from "../../types/auth";
import { AuthLayout } from "./AuthLayout";

/**
 * Self-registration grants ROLE_CAREGIVER and nothing else — the backend rejects anything
 * more — so the form offers no role picker.
 */
export function RegisterPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: RegisterInput) {
    setFormError(null);
    try {
      await authApi.register(values);
      toast.success("Account created", "Sign in with your new username to see your day.");
      navigate("/login", { replace: true });
    } catch (error) {
      // Replay the server's field-error map onto the form where the names line up.
      const fields = fieldErrors(error);
      let matched = false;
      for (const [name, message] of Object.entries(fields)) {
        if (name in values) {
          setError(name as keyof RegisterInput, { message });
          matched = true;
        }
      }
      if (!matched) {
        setFormError(errorMessage(error, "Could not create the account. Try again."));
      }
    }
  }

  return (
    <AuthLayout
      title="Create an account"
      intro="Caregiver accounts only. Your coordinator links this login to your profile and shifts."
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-pine-acc hover:underline">
            Sign in
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

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First name"
            autoComplete="given-name"
            autoFocus
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <Input
            label="Last name"
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...register("lastName")}
          />
        </div>

        <Input
          label="Username"
          autoComplete="username"
          error={errors.username?.message}
          {...register("username")}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={errors.password?.message}
          {...register("password")}
        />
        <Input
          label="Repeat password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={isSubmitting}
          loadingLabel="Creating"
        >
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
