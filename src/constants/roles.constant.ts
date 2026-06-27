export const ROLE_CODES = {
  MANAGER: 'Role1',
  EMPLOYEE: 'Role2',
  CEO: 'Role3',
} as const;

export const MANAGEMENT_ROLE_CODES = [
  ROLE_CODES.MANAGER,
  ROLE_CODES.CEO,
] as const;
