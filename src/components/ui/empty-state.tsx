import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';

type Props = {
  icon?: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'default' | 'error';
};

export function EmptyState({ icon = 'search', title, description, actionLabel, onAction, tone = 'default' }: Props) {
  const theme = useTheme();
  const accent = tone === 'error' ? theme.danger : theme.primary;
  const soft = tone === 'error' ? theme.dangerSoft : theme.primarySoft;

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: soft, borderRadius: Radius.xl }]}>
        <Icon name={tone === 'error' ? 'alert' : icon} size={30} color={accent} />
      </View>
      <Text variant="subtitle" center>
        {title}
      </Text>
      {description ? (
        <Text variant="body" color="textSecondary" center style={styles.desc}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} variant={tone === 'error' ? 'secondary' : 'primary'} onPress={onAction} icon={tone === 'error' ? 'refresh' : 'add'} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md, flexGrow: 1 },
  iconWrap: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  desc: { maxWidth: 320 },
});
