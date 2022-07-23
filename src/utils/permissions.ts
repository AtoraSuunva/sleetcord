import { PermissionResolvable, PermissionsBitField } from 'discord.js'

/**
 * Converts an array of permission resolvables to a permission string, preserves existing permission strings as strings, and null as null
 * @param permissions An array of permission resolvables, a permission string, or null
 * @returns A string of permissions, or null if the permissions were null
 */
export function permissionsToStringBitfield(
  permissions: PermissionResolvable[] | string | null,
): string | null {
  if (permissions === null || typeof permissions === 'string') {
    return permissions
  }

  return new PermissionsBitField(permissions).bitfield.toString()
}
