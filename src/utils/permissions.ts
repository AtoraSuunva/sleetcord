import { PermissionResolvable, Permissions } from 'discord.js'

export function permissionsToStringBitfield(
  default_member_permissions: PermissionResolvable[] | string | null,
): string | null {
  if (
    default_member_permissions === null ||
    typeof default_member_permissions === 'string'
  ) {
    return default_member_permissions
  }

  return new Permissions(default_member_permissions).bitfield.toString()
}
