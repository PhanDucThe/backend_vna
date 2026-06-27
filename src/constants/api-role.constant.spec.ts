import {
  API_ROLE_CODES,
  mapInternalRoleCodeToApi,
  mapInternalRoleCodesToApi,
  resolveRequestedInternalRoleCode,
  resolveRoleFilterInternalCodes,
} from './api-role.constant';
import { ROLE_CODES } from './roles.constant';

describe('API role contract mapping', () => {
  it.each([
    [ROLE_CODES.MANAGER, API_ROLE_CODES.ADMIN],
    [ROLE_CODES.CEO, API_ROLE_CODES.ADMIN],
    [ROLE_CODES.EMPLOYEE, API_ROLE_CODES.USER],
  ])('maps internal role %s to %s', (internalRole, apiRole) => {
    expect(mapInternalRoleCodeToApi(internalRole)).toBe(apiRole);
  });

  it('deduplicates Manager and CEO as ADMIN in API responses', () => {
    expect(
      mapInternalRoleCodesToApi([ROLE_CODES.MANAGER, ROLE_CODES.CEO]),
    ).toEqual([API_ROLE_CODES.ADMIN]);
  });

  it.each([
    ['ADMIN', ROLE_CODES.MANAGER],
    ['USER', ROLE_CODES.EMPLOYEE],
    ['Role1', ROLE_CODES.MANAGER],
    ['role2', ROLE_CODES.EMPLOYEE],
    ['Role3', ROLE_CODES.CEO],
  ])('resolves request role %s to %s', (requestRole, internalRole) => {
    expect(resolveRequestedInternalRoleCode(requestRole)).toBe(internalRole);
  });

  it('expands ADMIN and USER filters to internal role codes', () => {
    expect(resolveRoleFilterInternalCodes('ADMIN')).toEqual([
      ROLE_CODES.MANAGER,
      ROLE_CODES.CEO,
    ]);
    expect(resolveRoleFilterInternalCodes('USER')).toEqual([
      ROLE_CODES.EMPLOYEE,
    ]);
  });
});
