// Super Admin list combines static entries with env allowlist (NEXT_PUBLIC_RECRUITER_ALLOWLIST)
// We treat entries in NEXT_PUBLIC_RECRUITER_ALLOWLIST as Super Admins to allow access to both portals.
const staticSuperAdmins = [
  "bryce.mercines@whitecloak.com",
  "vince.carandang@whitecloak.com",
  "rafael.tiongson@whitecloak.com",
  "donn.gamboa@whitecloak.com",
  "anne.liango@whitecloak.com",
  "miguel.fermin@whitecloak.com",
  "michelle.cruz@whitecloak.com",
  "anne.liangco@whitecloak.com",
  "cyfernikolaisupleo@gmail.com",
];

const envAllowlist = (process.env.NEXT_PUBLIC_RECRUITER_ALLOWLIST || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const superAdminList = Array.from(
  new Set([...staticSuperAdmins.map((e) => e.toLowerCase()), ...envAllowlist])
);
