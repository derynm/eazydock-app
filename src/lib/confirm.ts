import { Alert, Platform } from 'react-native';

type Options = { title: string; message?: string; confirmLabel?: string; destructive?: boolean };

/** Promise-based confirm dialog (native Alert / web window.confirm). */
export function confirm({ title, message, confirmLabel = 'Confirm', destructive }: Options): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(message ? `${title}\n\n${message}` : title) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}
