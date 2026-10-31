export interface PersonalActor {
  userId: string;
  email: string;
  isPlatformOwner: boolean;
}

export interface PersonalSpace {
  id: string;
  name: string;
  owner_clerk_user_id: string;
  owner_email: string;
  assistant_name: string;
  infra_house: "luis" | "acevedo" | null;
  memory_provider: string | null;
  memory_status: "pending" | "connected" | "error";
  memory_reference: string | null;
}

/** A query parameter or matching nickname never grants access. */
export function canAccessPersonalSpace(actor: PersonalActor, space: PersonalSpace): boolean {
  return actor.isPlatformOwner || actor.userId === space.owner_clerk_user_id;
}

export function personalSpaceHref(spaceId: string): string {
  return `/workspace/casa?space=${encodeURIComponent(spaceId)}`;
}
