import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function Divider({ spacing = 0, inset = 0 }: { spacing?: number; inset?: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.line,
        { backgroundColor: theme.border, marginVertical: spacing, marginLeft: inset },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
});
