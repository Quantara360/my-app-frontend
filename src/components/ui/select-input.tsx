// Cross-platform replacement for the raw HTML <select>/<option> elements.
// On web it renders the real <select> (identical look/behavior to before).
// On native (Android/iOS) — where <select> isn't a valid host component and
// crashes with "View config getter callback for component `option`..." —
// it renders a Pressable trigger + modal option list instead.
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type SelectOption = { label: string; value: string };

type SelectInputProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  /** Style object passed straight through to the web <select> (CSS properties). */
  webStyle?: Record<string, unknown>;
  /** Style override for the native trigger button. */
  style?: StyleProp<ViewStyle>;
};

export function SelectInput({ value, onChange, options, disabled, webStyle, style }: SelectInputProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'web') {
    return (
      // @ts-ignore -- react-native-web passes unknown host tags straight to the DOM
      <select
        value={value}
        disabled={disabled}
        onChange={(e: any) => onChange(e.target.value)}
        style={webStyle}
      >
        {options.map((opt) => (
          // @ts-ignore
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  return (
    <>
      <Pressable
        style={[
          styles.trigger,
          { backgroundColor: theme.backgroundSelected, borderColor: theme.backgroundSelected },
          disabled && styles.triggerDisabled,
          style,
        ]}
        disabled={disabled}
        onPress={() => setOpen(true)}
      >
        <Text style={[styles.triggerText, { color: theme.text }]} numberOfLines={1}>
          {selectedLabel}
        </Text>
        <Text style={[styles.chevron, { color: theme.textSecondary }]}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}>
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.option, item.value === value && { backgroundColor: theme.backgroundSelected }]}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, { color: theme.text }, item.value === value && styles.optionTextSelected]}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 120,
    gap: 6,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerText: {
    fontSize: 14,
    flexShrink: 1,
  },
  chevron: {
    fontSize: 12,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    borderRadius: 12,
    maxHeight: '60%',
    overflow: 'hidden',
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.25)',
  },
  optionText: {
    fontSize: 15,
  },
  optionTextSelected: {
    fontWeight: '700',
  },
});
