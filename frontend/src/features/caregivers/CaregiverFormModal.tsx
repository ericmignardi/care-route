import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Modal } from "../../components/ui";
import { caregiversApi } from "../../api/caregivers";
import { errorMessage, fieldErrors } from "../../api/client";
import { toast } from "../../stores/toastStore";
import { SKILLS, SKILL_LABELS } from "../../lib/constants";
import { cn } from "../../lib/cn";
import type { CaregiverDetail } from "../../types/domain";

const createCaregiverSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name").max(100, "100 characters at most"),
  lastName: z.string().trim().min(1, "Enter a last name").max(100, "100 characters at most"),
  username: z.string().trim().min(1, "Choose a username").max(100, "100 characters at most"),
  password: z.string().min(8, "At least 8 characters").max(100, "100 characters at most"),
  phone: z.string().trim().max(30, "30 characters at most").optional().or(z.literal("")),
  skills: z.array(z.enum(SKILLS)).min(1, "Pick at least one — a caregiver with no skills can never be assigned"),
});

type CreateCaregiverValues = z.infer<typeof createCaregiverSchema>;

const EMPTY: CreateCaregiverValues = {
  firstName: "",
  lastName: "",
  username: "",
  password: "",
  phone: "",
  skills: [],
};

/**
 * Creates the login and the profile in one request (FR-1.4) — self-registration creates no
 * profile, so this is the only route to an account that can be scheduled.
 */
export function CaregiverFormModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (caregiver: CaregiverDetail) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateCaregiverValues>({
    resolver: zodResolver(createCaregiverSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) reset(EMPTY);
  }, [open, reset]);

  async function onSubmit(values: CreateCaregiverValues) {
    try {
      const created = await caregiversApi.create({
        username: values.username,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone?.trim() || undefined,
        skills: values.skills,
      });

      toast.success(
        "Caregiver added",
        `${created.firstName} ${created.lastName} can sign in as ${created.username}. Set their availability next.`,
      );
      onCreated(created);
      onClose();
    } catch (error) {
      const fields = fieldErrors(error);
      Object.entries(fields).forEach(([key, message]) => {
        if (key in EMPTY) setError(key as keyof CreateCaregiverValues, { message });
      });
      if (Object.keys(fields).length === 0) {
        toast.error("Could not create this caregiver", errorMessage(error));
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New caregiver"
      subtitle="Creates the login and the profile together. Availability is set on their page afterwards — until it is, nothing can be assigned to them."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSubmit(onSubmit)}
            loading={isSubmitting}
            loadingLabel="Creating…"
          >
            Create caregiver
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5" noValidate>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Input label="First name" required error={errors.firstName?.message} {...register("firstName")} />
          <Input label="Last name" required error={errors.lastName?.message} {...register("lastName")} />
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Input
            label="Username"
            required
            autoComplete="off"
            placeholder="grace.okonkwo"
            error={errors.username?.message}
            {...register("username")}
          />
          <Input
            label="Temporary password"
            type="password"
            required
            autoComplete="new-password"
            hint="At least 8 characters."
            error={errors.password?.message}
            {...register("password")}
          />
        </div>

        <Input
          label="Phone"
          type="tel"
          placeholder="(905) 512-0088"
          error={errors.phone?.message}
          {...register("phone")}
        />

        <Controller
          control={control}
          name="skills"
          render={({ field }) => (
            <fieldset>
              <legend className="text-[11.5px] leading-none font-semibold text-ink">
                Qualified for
                <span aria-hidden="true" className="text-mis-fg">
                  {" *"}
                </span>
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {SKILLS.map((skill) => {
                  const checked = field.value.includes(skill);
                  return (
                    <label
                      key={skill}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-[5px] border px-2.5 py-2",
                        "text-[12.5px] leading-none font-semibold",
                        checked
                          ? "border-pine-line bg-pine-tint text-pine-acc"
                          : "border-line-2 bg-panel text-ink-2 hover:border-line-3",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          field.onChange(
                            event.target.checked
                              ? [...field.value, skill]
                              : field.value.filter((value) => value !== skill),
                          )
                        }
                        className="size-3.5 accent-[var(--pine)]"
                      />
                      {SKILL_LABELS[skill]}
                    </label>
                  );
                })}
              </div>
              {errors.skills && (
                <p className="mt-1.5 text-[11.5px] leading-[1.5] font-semibold text-mis-fg">
                  {errors.skills.message}
                </p>
              )}
            </fieldset>
          )}
        />

        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  );
}
