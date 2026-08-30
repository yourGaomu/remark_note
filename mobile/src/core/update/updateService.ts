import * as Updates from 'expo-updates';

export type UpdateCheckOutcome = 'disabled' | 'current' | 'updated';

export interface UpdateIdentity {
  appVersion: string;
  channel: string;
  runtimeVersion: string;
  updateId: string;
  isEmbedded: boolean;
}

export function getUpdateIdentity(): UpdateIdentity {
  return {
    appVersion: getManifestAppVersion(),
    channel: Updates.channel ?? 'development',
    runtimeVersion: Updates.runtimeVersion ?? 'development',
    updateId: Updates.updateId ?? 'embedded',
    isEmbedded: Updates.isEmbeddedLaunch,
  };
}

function getManifestAppVersion(): string {
  const manifest = Updates.manifest as { extra?: { expoClient?: { version?: string } } };
  return manifest.extra?.expoClient?.version ?? '1.0.2';
}

export async function checkAndApplyUpdate(): Promise<UpdateCheckOutcome> {
  if (!Updates.isEnabled) {
    return 'disabled';
  }

  const checkResult = await Updates.checkForUpdateAsync();

  if (!checkResult.isAvailable) {
    return 'current';
  }

  const fetchResult = await Updates.fetchUpdateAsync();

  if (!fetchResult.isNew) {
    return 'current';
  }

  await Updates.reloadAsync();
  return 'updated';
}
