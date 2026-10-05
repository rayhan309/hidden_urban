import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import { AdminUser, type AdminUserDocument } from "@/models/AdminUser";
import { hashPassword } from "@/lib/auth/password";

export function toPublicAdminUser(doc: AdminUserDocument) {
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    role: doc.role,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function getAdminUserModel() {
  await dbConnect();
  return AdminUser;
}

/**
 * Optionally seeds the first Super Admin from env.
 * Does nothing (returns null) when env is missing and no super admin exists yet —
 * live deployments can rely on DB users without SUPER_ADMIN_* env vars.
 */
export async function ensureSuperAdmin() {
  const User = await getAdminUserModel();
  const existing = await User.findOne({ role: "super_admin" });
  if (existing) {
    return toPublicAdminUser(existing);
  }

  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME?.trim() || "Super Admin";

  if (!email || !password) {
    return null;
  }

  const passwordHash = await hashPassword(password);
  const created = await User.create({
    email,
    name,
    role: "super_admin",
    passwordHash,
  });

  return toPublicAdminUser(created);
}

export async function findAdminUserByEmail(email: string) {
  const User = await getAdminUserModel();
  return User.findOne({ email: email.trim().toLowerCase() });
}

export async function findAdminUserByEmailWithPassword(email: string) {
  const User = await getAdminUserModel();
  return User.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");
}

export async function listAdminUsers() {
  const User = await getAdminUserModel();
  return User.find({}).sort({ createdAt: -1 });
}

export async function createAdminUserRecord(payload: {
  email: string;
  name: string;
  role: "shop_manager" | "moderator";
  passwordHash: string;
}) {
  const User = await getAdminUserModel();
  return User.create(payload);
}

export async function findAdminUserById(id: string) {
  const User = await getAdminUserModel();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return User.findById(id);
}

export async function findAdminUserByIdWithPassword(id: string) {
  const User = await getAdminUserModel();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return User.findById(id).select("+passwordHash");
}

export async function updateOwnAdminProfile(
  id: string,
  updates: { name?: string; passwordHash?: string },
) {
  const User = await getAdminUserModel();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const $set: { name?: string; passwordHash?: string } = {};
  if (updates.name !== undefined) $set.name = updates.name;
  if (updates.passwordHash !== undefined) $set.passwordHash = updates.passwordHash;
  if (Object.keys($set).length === 0) return User.findById(id);

  return User.findByIdAndUpdate(id, { $set }, { new: true, runValidators: true });
}

export async function deleteAdminUserById(id: string) {
  const User = await getAdminUserModel();
  return User.findByIdAndDelete(id);
}
