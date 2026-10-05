"use client";

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, type FormEventHandler, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useToast } from "@/context/toast/ToastProvider";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_ACCENT } from "@/lib/constants/admin";
import { updateOwnProfile } from "@/services/account";

type AccountForm = {
  name: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function AccountSettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, refresh } = useAuth();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AccountForm>({
    defaultValues: {
      name: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: user?.name ?? "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }, [open, reset, user?.name]);

  async function onSubmit(values: AccountForm) {
    const newPassword = values.newPassword.trim();
    const confirmPassword = values.confirmPassword.trim();

    if (newPassword && newPassword !== confirmPassword) {
      setError("confirmPassword", { message: "Passwords do not match" });
      return;
    }

    try {
      await updateOwnProfile({
        name: values.name.trim(),
        currentPassword: values.currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      await refresh();
      const nameChanged = values.name.trim() !== (user?.name ?? "");
      const message =
        nameChanged && newPassword
          ? "Name and password updated"
          : newPassword
            ? "Password updated"
            : "Name updated";
      showToast(message);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update account";
      if (message.toLowerCase().includes("current password")) {
        setError("currentPassword", { message });
        return;
      }
      if (message.toLowerCase().includes("password")) {
        setError("newPassword", { message });
        return;
      }
      setError("name", { message });
    }
  }

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>Your account</DialogTitle>
      <BoxForm onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2}>
            <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
              {user?.email}
            </Typography>
            <TextField
              label="Full name"
              fullWidth
              autoComplete="name"
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
              {...register("name", {
                required: "Name is required",
                minLength: { value: 2, message: "At least 2 characters" },
                validate: (value) => value.trim().length >= 2 || "At least 2 characters",
              })}
            />
            <Alert severity="info" sx={{ borderRadius: 1 }}>
              Leave the password fields blank to keep your current password.
            </Alert>
            <TextField
              label="Current password"
              type="password"
              fullWidth
              autoComplete="current-password"
              error={Boolean(errors.currentPassword)}
              helperText={errors.currentPassword?.message ?? "Required only when setting a new password"}
              {...register("currentPassword")}
            />
            <TextField
              label="New password"
              type="password"
              fullWidth
              autoComplete="new-password"
              error={Boolean(errors.newPassword)}
              helperText={errors.newPassword?.message}
              {...register("newPassword", {
                validate: (value) => {
                  const next = value.trim();
                  if (!next) return true;
                  return next.length >= 8 || "At least 8 characters";
                },
              })}
            />
            <TextField
              label="Confirm new password"
              type="password"
              fullWidth
              autoComplete="new-password"
              error={Boolean(errors.confirmPassword)}
              helperText={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            sx={{
              bgcolor: ADMIN_ACCENT,
              textTransform: "none",
              fontWeight: 600,
              "&:hover": { bgcolor: "#185a4a" },
            }}
          >
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </DialogActions>
      </BoxForm>
    </Dialog>
  );
}

function BoxForm({
  onSubmit,
  children,
}: {
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
}) {
  return (
    <form noValidate onSubmit={onSubmit}>
      {children}
    </form>
  );
}
