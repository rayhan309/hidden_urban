import { z } from "zod";

export const adminRoles = ["super_admin", "shop_manager", "moderator"] as const;
export type AdminRole = (typeof adminRoles)[number];

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  shop_manager: "Shop Manager",
  moderator: "Moderator",
};

export const adminUserPublicSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(adminRoles),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
});

export type AdminUserPublic = z.infer<typeof adminUserPublicSchema>;

export const loginBodySchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const createAdminUserBodySchema = z.object({
  email: z.string().email("Enter a valid email"),
  name: z.string().min(2, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["shop_manager", "moderator"]),
});

export const updateAdminUserBodySchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["shop_manager", "moderator"]).optional(),
  password: z.string().min(8).optional(),
});

export const updateOwnProfileBodySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
});
