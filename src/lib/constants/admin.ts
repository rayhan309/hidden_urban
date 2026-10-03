import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import PeopleOutlineOutlinedIcon from "@mui/icons-material/PeopleOutlineOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import type { SvgIconComponent } from "@mui/icons-material";
import { canAccessPath, canManageUsers } from "@/lib/auth/permissions";
import type { AdminRole } from "@/lib/validations/admin-user";

export type AdminNavLink = {
  type: "link";
  label: string;
  href: string;
  icon: SvgIconComponent;
};

export type AdminNavGroup = {
  type: "group";
  label: string;
  icon: SvgIconComponent;
  children: { label: string; href: string }[];
};

export type AdminNavEntry = AdminNavLink | AdminNavGroup;

export const ADMIN_NAV: AdminNavEntry[] = [
  { type: "link", label: "Overview", href: "/dashboard/admin", icon: DashboardOutlinedIcon },
  { type: "link", label: "Orders", href: "/dashboard/admin/orders", icon: ShoppingBagOutlinedIcon },
  {
    type: "group",
    label: "Products",
    icon: Inventory2OutlinedIcon,
    children: [
      { label: "All products", href: "/dashboard/admin/products" },
      { label: "Attributes", href: "/dashboard/admin/products/attributes" },
      { label: "Categories", href: "/dashboard/admin/categories" },
      { label: "Collections", href: "/dashboard/admin/collections" },
    ],
  },
  { type: "link", label: "Customers", href: "/dashboard/admin/customers", icon: PeopleOutlineOutlinedIcon },
  {
    type: "link",
    label: "Users",
    href: "/dashboard/admin/users",
    icon: ManageAccountsOutlinedIcon,
  },
  {
    type: "group",
    label: "Settings",
    icon: SettingsOutlinedIcon,
    children: [
      { label: "General", href: "/dashboard/admin/settings" },
      { label: "Hero", href: "/dashboard/admin/settings/hero" },
      { label: "Pixel & CAPI", href: "/dashboard/admin/settings/pixel" },
      { label: "Steadfast", href: "/dashboard/admin/settings/steadfast" },
      { label: "Shipping", href: "/dashboard/admin/settings/shipping" },
      { label: "Contact", href: "/dashboard/admin/settings/contact" },
    ],
  },
  {
    type: "group",
    label: "Reports",
    icon: AssessmentOutlinedIcon,
    children: [
      { label: "All Customers", href: "/dashboard/admin/reports" },
      { label: "Repeat Customers", href: "/dashboard/admin/reports/repeat-customers" },
      { label: "Locations", href: "/dashboard/admin/reports/locations" },
    ],
  },
];

export function filterNavForRole(role: AdminRole): AdminNavEntry[] {
  const result: AdminNavEntry[] = [];

  for (const entry of ADMIN_NAV) {
    if (entry.type === "link") {
      if (entry.href === "/dashboard/admin/users" && !canManageUsers(role)) {
        continue;
      }
      if (canAccessPath(role, entry.href)) {
        result.push(entry);
      }
      continue;
    }

    const children = entry.children.filter((child) => canAccessPath(role, child.href));
    if (children.length > 0) {
      result.push({ ...entry, children });
    }
  }

  return result;
}

export const ADMIN_SIDEBAR_WIDTH = 272;
export const ADMIN_ACCENT = "#1f6f5b";
export const ADMIN_SIDEBAR_BG = "#1a2234";
