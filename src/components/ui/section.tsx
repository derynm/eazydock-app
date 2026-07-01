import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { Text } from './text';

type Props = { title: string; action?: ReactNode; children: ReactNode };

export function Section({ title, action, children }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text variant="overline" color="textMuted">
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
