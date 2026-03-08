import React from 'react';
import { TextInput, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/tokens';

interface InputProps {
  value: string;
  onChangeText: (t: string) => void;
  label?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  multiline?: boolean;
}

export default function Input({
  value,
  onChangeText,
  label,
  placeholder,
  keyboardType,
  multiline,
}: InputProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      ) : null}
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            backgroundColor: colors.inputBackground,
            color: colors.foreground,
            borderColor: colors.border,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing[3] },
  label: { fontSize: 12, marginBottom: 4, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderRadius: radius.inputCustom,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: 16,
  },
  inputMultiline: { minHeight: 60, textAlignVertical: 'top' },
});
