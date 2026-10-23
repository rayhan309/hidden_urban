"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
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
import Image from "next/image";
import { useMemo, useState } from "react";
import { AddCategoryDialog } from "@/components/admin/categories/AddCategoryDialog";
import { useToast } from "@/context/toast/ToastProvider";
import { ADMIN_ACCENT } from "@/lib/constants/admin";
import { queryKeys } from "@/lib/queries/query-keys";
import {
  createAdminCategory,
  deleteAdminCategory,
  reorderAdminCategories,
  updateAdminCategory,
} from "@/services/admin-category-mutations";
import type { AdminCategory } from "@/types/admin-category";

const PAGE_SIZE = 10;

type AdminCategoriesViewProps = {
  categories: AdminCategory[];
};

function reorderList(list: AdminCategory[], from: number, to: number) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next.map((row, index) => ({ ...row, sortOrder: index + 1 }));
}

export function AdminCategoriesView({ categories }: AdminCategoriesViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    if (!q) return sorted;
    return sorted.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        cat.slug.toLowerCase().includes(q) ||
        cat.description.toLowerCase().includes(q),
    );
  }, [categories, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      slug: string;
      image: string;
      description: string;
    }) => {
      if (dialogMode === "edit" && editing) {
        return updateAdminCategory(editing.id, payload);
      }
      return createAdminCategory(payload);
    },
    onSuccess: async () => {
      showToast(dialogMode === "edit" ? "Category updated" : "Category created");
      setDialogOpen(false);
      setEditing(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.site.categories() }),
      ]);
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : "Failed to save category", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminCategory(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      showToast("Category deleted");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.site.categories() }),
      ]);
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : "Failed to delete category", "error");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => reorderAdminCategories(orderedIds),
    onSuccess: async (next) => {
      queryClient.setQueryData(queryKeys.admin.categories(), next);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.site.categories() }),
      ]);
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : "Failed to reorder categories", "error");
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.site.categories() }),
      ]);
    },
  });

  function openAdd() {
    setDialogMode("add");
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(category: AdminCategory) {
    setDialogMode("edit");
    setEditing(category);
    setDialogOpen(true);
  }

  function handleDrop(targetId: string) {
    if (dragIndex === null || reorderMutation.isPending) return;
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const toIndex = sorted.findIndex((c) => c.id === targetId);
    if (toIndex < 0 || dragIndex === toIndex) {
      setDragIndex(null);
      return;
    }
    const next = reorderList(sorted, dragIndex, toIndex);
    setDragIndex(null);
    queryClient.setQueryData(queryKeys.admin.categories(), next);
    reorderMutation.mutate(next.map((item) => item.id));
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
            Product categories
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: "0.9rem", color: "text.secondary" }}>
            Add, edit, and reorder categories. Changes save to the database.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={openAdd}
          sx={{
            flexShrink: 0,
            bgcolor: ADMIN_ACCENT,
            fontWeight: 600,
            textTransform: "none",
            px: 2,
            "&:hover": { bgcolor: "#185a4a" },
          }}
        >
          Add category
        </Button>
      </Box>

      {reorderMutation.isError ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>
          Could not save category order. Refresh and try again.
        </Alert>
      ) : null}

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
        <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "rgba(0,0,0,0.06)" }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by name, slug, or description..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            sx={{ width: "100%", bgcolor: "#f8fafc" }}
          />
        </Box>

        <Box
          sx={{
            px: 2,
            py: 1.25,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            borderBottom: "1px solid",
            borderColor: "rgba(0,0,0,0.06)",
            bgcolor: "#fafafa",
          }}
        >
          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
            Drag rows to change storefront order.
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
            {filtered.length} item{filtered.length === 1 ? "" : "s"}
          </Typography>
        </Box>

        <TableContainer sx={{ width: "100%", overflowX: "auto" }}>
          <Table size="small" sx={{ width: "100%", minWidth: 800 }}>
            <TableHead>
              <TableRow>
                {["#", "Image", "Name", "Slug", "Description", "Actions"].map((h) => (
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
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 6, textAlign: "center" }}>
                    <Typography color="text.secondary">No categories found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((category) => {
                  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
                  const dragFrom = sorted.findIndex((c) => c.id === category.id);

                  return (
                    <TableRow
                      key={category.id}
                      hover
                      draggable={!reorderMutation.isPending}
                      onDragStart={() => setDragIndex(dragFrom)}
                      onDragEnd={() => setDragIndex(null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(category.id)}
                      sx={{ cursor: reorderMutation.isPending ? "default" : "grab" }}
                    >
                      <TableCell sx={{ width: 72 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <DragIndicatorRoundedIcon
                            sx={{ fontSize: 18, color: "text.disabled" }}
                          />
                          <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                            {category.sortOrder}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ width: 72 }}>
                        <Box
                          sx={{
                            position: "relative",
                            width: 48,
                            height: 48,
                            borderRadius: 1,
                            overflow: "hidden",
                            bgcolor: "#f1f5f9",
                            border: "1px solid rgba(0,0,0,0.06)",
                          }}
                        >
                          {category.image ? (
                            <Image
                              src={category.image}
                              alt={category.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : null}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.9rem" }}>
                        {category.name}
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: ADMIN_ACCENT,
                          }}
                        >
                          /{category.slug}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
                        {category.description.trim() ? category.description : "—"}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            aria-label={`Edit ${category.name}`}
                            onClick={() => openEdit(category)}
                          >
                            <EditOutlinedIcon sx={{ fontSize: 18, color: "#64748b" }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            aria-label={`Delete ${category.name}`}
                            onClick={() => setDeleteTarget(category)}
                          >
                            <DeleteOutlineRoundedIcon
                              sx={{ fontSize: 18, color: "#dc2626" }}
                            />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            borderTop: "1px solid",
            borderColor: "rgba(0,0,0,0.06)",
            bgcolor: "#fafafa",
          }}
        >
          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
            {filtered.length === 0
              ? "Showing 0 of 0"
              : `Showing ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              size="small"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              sx={{ textTransform: "none", minWidth: 72 }}
            >
              Previous
            </Button>
            <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
              Page {currentPage} / {totalPages}
            </Typography>
            <Button
              size="small"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              sx={{ textTransform: "none", minWidth: 56 }}
            >
              Next
            </Button>
          </Box>
        </Box>
      </Box>

      <AddCategoryDialog
        open={dialogOpen}
        mode={dialogMode}
        initial={editing}
        saving={saveMutation.isPending}
        onClose={() => {
          if (saveMutation.isPending) return;
          setDialogOpen(false);
          setEditing(null);
        }}
        onSave={async (payload) => {
          await saveMutation.mutateAsync(payload);
        }}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}
      >
        <DialogTitle>Delete category?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteTarget
              ? `“${deleteTarget.name}” will be removed from the catalog. This cannot be undone.`
              : ""}
          </DialogContentText>
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
