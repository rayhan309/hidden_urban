import { api } from "@/lib/axios";
import { adminUserPublicSchema, type AdminUserPublic } from "@/lib/validations/admin-user";
import { z } from "zod";

const profileResponseSchema = z.object({
  user: adminUserPublicSchema,
});

export async function updateOwnProfile(payload: {
  name: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<AdminUserPublic> {
  const { data } = await api.patch("/api/auth/profile", payload);
  return profileResponseSchema.parse(data).user;
}
