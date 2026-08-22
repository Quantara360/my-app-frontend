// Cross-platform time picker, sibling to date-input.tsx. On web it renders a
// real <input type="time">. On native it renders a Pressable that opens the
// native @react-native-community/datetimepicker in time mode.
import { useState } from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTheme } from '@/hooks/use-theme';

type TimeInputProps = {
  /** "HH:mm" 24-hour string, or '' when unset. */
  value: string;
  onChange: (value: string) => void;
  webStyle?: Record<string, unknown>;
  style?: StyleProp<ViewStyle>;
  placeholder?: string;
};

function parseHHmm(value: string): Date {
  const d = new Date();
  if (!value) return d;
  const [h, m] = value.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return d;
  d.setHours(h, m, 0, 0);
  return d;
}

function formatHHmm(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function TimeInput({ value, onChange, webStyle, style, placeholder = '--:--' }: TimeInputProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'web') {
    return (
      // @ts-ignore -- react-native-web passes unknown host tags straight to the DOM
      <input type="time" value={value} onChange={(e: any) => onChange(e.target.value)} style={webStyle} />
    );
  }

  return (
    <View>
      <Pressable
        style={[
          styles.trigger,
          { backgroundColor: theme.backgroundSelected, borderColor: theme.backgroundSelected },
          style,
        ]}
        onPress={() => setOpen(true)}
      >
        <Text style={{ color: value ? theme.text : theme.textSecondary, fontSize: 14 }}>
          {value || placeholder}
        </Text>
      </Pressable>
      {open && (
        <>
          <DateTimePicker
            value={parseHHmm(value)}
            mode="time"
            is24Hour
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_event, date) => {
              setOpen(Platform.OS === 'ios');
              if (date) onChange(formatHHmm(date));
            }}
          />
          {Platform.OS === 'ios' && (
            <Pressable onPress={() => setOpen(false)} style={styles.doneButton}>
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>Done</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 100,
    minHeight: 40,
    justifyContent: 'center',
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
});
