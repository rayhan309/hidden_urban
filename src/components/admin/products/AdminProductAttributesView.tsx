"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { ProductAttribute } from "@/data/dummy/product-attributes";
import { useToast } from "@/context/toast/ToastProvider";
import { ADMIN_ACCENT } from "@/lib/constants/admin";
import { queryKeys } from "@/lib/queries/query-keys";
import {
  productAttributeFormSchema,
  slugifyAttributeName,
  type ProductAttributeFormValues,
} from "@/lib/validations/product-attribute";
import {
  createProductAttribute,
  deleteProductAttribute,
  updateProductAttribute,
} from "@/services/admin-product-attributes";

type AdminProductAttributesViewProps = {
  attributes: ProductAttribute[];
};

const emptyForm: ProductAttributeFormValues = {
  name: "",
  nameBn: "",
  slug: "",
  placeholder: "",
};

export function AdminProductAttributesView({ attributes }: AdminProductAttributesViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductAttribute | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductAttribute | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductAttributeFormValues>({
    defaultValues: emptyForm,
  });

  const nameValue = watch("name");
  const slugValue = watch("slug");

  const sortedAttributes = useMemo(
    () => [...attributes].sort((a, b) => a.name.localeCompare(b.name)),
    [attributes],
  );

  function openCreate() {
    setEditing(null);
    reset(emptyForm);
    setFormOpen(true);
  }

  function openEdit(attr: ProductAttribute) {
    setEditing(attr);
    reset({
      name: attr.name,
      nameBn: attr.nameBn,
      slug: attr.slug,
      placeholder: attr.placeholder,
    });
    setFormOpen(true);
  }

  function closeFormDialog() {
    setFormOpen(false);
    setEditing(null);
    reset(emptyForm);
  }

  const saveMutation = useMutation({
    mutationFn: async (values: ProductAttributeFormValues) => {
      const parsed = productAttributeFormSchema.parse(values);
      if (editing) {
        return updateProductAttribute(editing.id, parsed);
      }
      return createProductAttribute(parsed);
    },
    onSuccess: async () => {
      showToast(editing ? "Attribute updated successfully" : "Attribute created successfully");
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.productAttributes() });
      closeFormDialog();
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : "Failed to save attribute", "error");
    },
  });

  function closeForm() {
    if (saveMutation.isPending) return;
    closeFormDialog();
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProductAttribute(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      showToast("Attribute deleted successfully");
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.productAttributes() });
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : "Failed to delete attribute", "error");
    },
  });

  function autoSlugFromName() {
    if (!slugValue.trim() && nameValue.trim()) {
      setValue("slug", slugifyAttributeName(nameValue), { shouldValidate: true });
    }
  }

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { sm: "flex-start" },
          justifyContent: "space-between",
          gap: 2,
          mb: 2.5,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: ADMIN_ACCENT,
            }}
          >
            Catalog
          </Typography>
          <Typography
            sx={{
              mt: 0.5,
              fontSize: { xs: "1.35rem", sm: "1.5rem" },
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Product attributes
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: "0.9rem", color: "text.secondary" }}>
            Create variation types like Size, Weight, Color — stored in your database.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={openCreate}
          sx={{
            flexShrink: 0,
            bgcolor: ADMIN_ACCENT,
            fontWeight: 600,
            textTransform: "none",
            px: 2,
            "&:hover": { bgcolor: "#185a4a" },
          }}
        >
          Add attribute
        </Button>
      </Box>

      <Box
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "rgba(0,0,0,0.06)",
          bgcolor: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        <TableContainer sx={{ width: "100%", overflowX: "auto" }}>
          <Table size="medium" sx={{ width: "100%", minWidth: 720 }}>
            <TableHead>
              <TableRow>
                {["Name", "Bangla", "Slug", "Placeholder", "Actions"].map((h) => (
                  <TableCell
                    key={h}
                    align={h === "Actions" ? "right" : "left"}
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.7rem",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "text.secondary",
                      bgcolor: "#f8fafc",
                      borderBottomColor: "rgba(0,0,0,0.06)",
                      py: 1.75,
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedAttributes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 6, textAlign: "center" }}>
                    <Typography color="text.secondary">
                      No attributes yet. Add one to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                sortedAttributes.map((attr) => (
                  <TableRow key={attr.id} hover>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.9rem", py: 2 }}>
                      {attr.name}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem", py: 2 }}>{attr.nameBn}</TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography
                        component="code"
                        sx={{
                          fontFamily: "var(--font-mono), monospace",
                          fontSize: "0.85rem",
                          color: "#475569",
                          bgcolor: "#f1f5f9",
                          px: 1,
                          py: 0.35,
                          borderRadius: 0.75,
                        }}
                      >
                        {attr.slug}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.875rem", color: "text.secondary", py: 2 }}>
                      {attr.placeholder}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2 }}>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit ${attr.name}`}
                          onClick={() => openEdit(attr)}
                        >
                          <EditOutlinedIcon sx={{ fontSize: 18, color: ADMIN_ACCENT }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          aria-label={`Delete ${attr.name}`}
                          onClick={() => setDeleteTarget(attr)}
                        >
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 18, color: "#dc2626" }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog open={formOpen} onClose={closeForm} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleSubmit((values) => saveMutation.mutate(values))}>
          <DialogTitle>{editing ? "Edit attribute" : "Add attribute"}</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="Name"
              fullWidth
              required
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
              {...register("name")}
              onBlur={autoSlugFromName}
            />
            <TextField
              label="Bangla name"
              fullWidth
              required
              error={Boolean(errors.nameBn)}
              helperText={errors.nameBn?.message}
              {...register("nameBn")}
            />
            <TextField
              label="Slug"
              fullWidth
              required
              error={Boolean(errors.slug)}
              helperText={errors.slug?.message ?? "Auto-generated from name if left empty on blur"}
              {...register("slug")}
            />
            <TextField
              label="Placeholder"
              fullWidth
              required
              error={Boolean(errors.placeholder)}
              helperText={errors.placeholder?.message ?? "Example values shown to staff"}
              {...register("placeholder")}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeForm} disabled={saveMutation.isPending} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saveMutation.isPending}
              sx={{ bgcolor: ADMIN_ACCENT, textTransform: "none", "&:hover": { bgcolor: "#185a4a" } }}
            >
              {saveMutation.isPending ? "Saving…" : editing ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}
      >
        <DialogTitle>Delete attribute?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {deleteTarget
              ? `“${deleteTarget.name}” will be removed. This cannot be undone.`
              : ""}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleteMutation.isPending}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending || !deleteTarget}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            sx={{ textTransform: "none" }}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
