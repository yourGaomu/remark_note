import * as Updates from 'expo-updates';

export type UpdateCheckOutcome = 'disabled' | 'current' | 'updated';

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
