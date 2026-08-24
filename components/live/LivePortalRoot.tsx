"use client";

import { LivePortal, type LivePortalMe, type LivePortalProject } from "@/components/live/LivePortal";
import {
  LivePortalMobileEntry,
  useIsPhone,
} from "@/components/live/LivePortalMobileEntry";

export function LivePortalRoot({
  project,
  me,
}: {
  project: LivePortalProject;
  me: LivePortalMe;
}) {
  const isPhone = useIsPhone(768);

  if (isPhone) {
    return <LivePortalMobileEntry project={project} me={me} />;
  }

  return <LivePortal project={project} me={me} />;
}
