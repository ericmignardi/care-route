import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal, Select } from "../../components/ui";
import { clientsApi } from "../../api/clients";
import { errorMessage, fieldErrors } from "../../api/client";
import { toast } from "../../stores/toastStore";
import { clientSchema, type ClientFormValues } from "./clientSchema";
import type { Client } from "../../types/domain";

const EMPTY: ClientFormValues = {
  firstName: "",
  lastName: "",
  phone: "",
  addressLine: "",
  city: "",
  postalCode: "",
  status: "ACTIVE",
};

/** One modal for create and edit; `client` being present is the only difference. */
export function ClientFormModal({
  open,
  client,
  onClose,
  onSaved,
}: {
  open: boolean;
  client?: Client | null;
  onClose: () => void;
  onSaved: (client: Client) => void;
}) {
  const editing = Boolean(client);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: EMPTY,
  });

  // Re-seed whenever the modal opens, so reopening on a different client does not show
  // the previous one's values for a frame.
  useEffect(() => {
    if (!open) return;
    reset(
      client
        ? {
            firstName: client.firstName,
            lastName: client.lastName,
            phone: client.phone ?? "",
            addressLine: client.addressLine,
            city: client.city,
            postalCode: client.postalCode,
            status: client.status,
          }
        : EMPTY,
    );
  }, [open, client, reset]);

  async function onSubmit(values: ClientFormValues) {
    const request = { ...values, phone: values.phone?.trim() || undefined };

    try {
      const saved = client
        ? await clientsApi.update(client.id, request)
        : await clientsApi.create(request);

      toast.success(
        editing ? "Client updated" : "Client added",
        `${saved.firstName} ${saved.lastName} · ${saved.addressLine}, ${saved.city}`,
      );
      onSaved(saved);
      onClose();
    } catch (error) {
      // Replay the server's field-error map onto the matching inputs; anything that does
      // not line up with a field falls back to a toast rather than vanishing.
      const fields = fieldErrors(error);
      const keys = Object.keys(fields) as Array<keyof ClientFormValues>;
      keys.forEach((key) => {
        if (key in EMPTY) setError(key, { message: fields[key as string] });
      });
      if (keys.length === 0) toast.error("Could not save this client", errorMessage(error));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit client" : "New client"}
      subtitle={
        editing
          ? "Changes apply to future visits. Completed visits keep the plan they were performed against."
          : "The address and postal code are what a caregiver navigates to on a February morning."
      }
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSubmit(onSubmit)}
            loading={isSubmitting}
            loadingLabel="Saving…"
          >
            {editing ? "Save changes" : "Add client"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5" noValidate>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Input label="First name" required error={errors.firstName?.message} {...register("firstName")} />
          <Input label="Last name" required error={errors.lastName?.message} {...register("lastName")} />
        </div>

        <Input
          label="Street address"
          required
          placeholder="42 Sulphur Springs Rd"
          error={errors.addressLine?.message}
          {...register("addressLine")}
        />

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <Input label="City" required placeholder="Ancaster" error={errors.city?.message} {...register("city")} />
          <Input
            label="Postal code"
            required
            placeholder="L9G 3L1"
            error={errors.postalCode?.message}
            {...register("postalCode")}
          />
          <Input
            label="Phone"
            type="tel"
            placeholder="(905) 648-2214"
            error={errors.phone?.message}
            {...register("phone")}
          />
        </div>

        <Select
          label="Status"
          options={[
            { value: "ACTIVE", label: "Active — visits can be scheduled" },
            { value: "INACTIVE", label: "Inactive — no longer in care" },
          ]}
          error={errors.status?.message}
          {...register("status")}
        />

        {/* Submitting with Enter has to work; the footer button lives outside the form. */}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  );
}
