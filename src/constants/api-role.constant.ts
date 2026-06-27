import { ROLE_CODES } from './roles.constant';

export const API_ROLE_CODES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

const INTERNAL_ROLE_CODES = Object.values(ROLE_CODES);

export function mapInternalRoleCodeToApi(roleCode: string) {
  const normalizedRoleCode = normalizeInternalRoleCode(roleCode);

  if (
    normalizedRoleCode === ROLE_CODES.MANAGER ||
    normalizedRoleCode === ROLE_CODES.CEO
  ) {
    return API_ROLE_CODES.ADMIN;
  }

  if (normalizedRoleCode === ROLE_CODES.EMPLOYEE) {
    return API_ROLE_CODES.USER;
  }

  return roleCode;
}

export function mapInternalRoleCodesToApi(roleCodes: string[]) {
  return [
    ...new Set(roleCodes.map((roleCode) => mapInternalRoleCodeToApi(roleCode))),
  ];
}

export function resolveRequestedInternalRoleCode(roleCode: string) {
  const normalizedValue = roleCode.trim();

  if (normalizedValue.toUpperCase() === API_ROLE_CODES.ADMIN) {
    return ROLE_CODES.MANAGER;
  }

  if (normalizedValue.toUpperCase() === API_ROLE_CODES.USER) {
    return ROLE_CODES.EMPLOYEE;
  }

  return normalizeInternalRoleCode(normalizedValue);
}

export function resolveRoleFilterInternalCodes(roleCode: string) {
  const normalizedValue = roleCode.trim();
  const apiRoleCode = normalizedValue.toUpperCase();

  if (apiRoleCode === API_ROLE_CODES.ADMIN) {
    return [ROLE_CODES.MANAGER, ROLE_CODES.CEO];
  }

  if (apiRoleCode === API_ROLE_CODES.USER) {
    return [ROLE_CODES.EMPLOYEE];
  }

  const internalRoleCode = normalizeInternalRoleCode(normalizedValue);
  return internalRoleCode ? [internalRoleCode] : null;
}

function normalizeInternalRoleCode(roleCode: string) {
  return (
    INTERNAL_ROLE_CODES.find(
      (internalRoleCode) =>
        internalRoleCode.toLowerCase() === roleCode.toLowerCase(),
    ) ?? null
  );
}
