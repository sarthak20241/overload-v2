import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';

interface PrimaryButtonProps {
  onPress: () => void;
  title: string;
  disabled?: boolean;
  loading?: boolean;
}

export default function PrimaryButton({ onPress, title, disabled, loading }: PrimaryButtonProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.btn,
        {
          backgroundColor: disabled ? colors.muted : colors.ctaBg,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.ctaFg} />
      ) : (
        <Text style={[styles.text, { color: colors.ctaFg }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.buttonCta,
    paddingVertical: 14,
    alignItems: 'center',
  },
  text: { fontSize: 14, fontWeight: '900' },
});
