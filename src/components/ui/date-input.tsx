// Cross-platform replacement for a raw HTML <input type="date"> used as a
// visible filter field. On web it renders the real <input> (identical look
// to before). On native it renders a Pressable that opens the native
// @react-native-community/datetimepicker — raw <input> isn't a valid host
// component off web and crashes there.
import { useState } from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTheme } from '@/hooks/use-theme';

type DateInputProps = {
  /** ISO date string 'YYYY-MM-DD', or '' when unset. */
  value: string;
  onChange: (value: string) => void;
  webStyle?: Record<string, unknown>;
  style?: StyleProp<ViewStyle>;
  placeholder?: string;
};

function parseISODate(value: string): Date {
  if (!value) return new Date();
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function DateInput({ value, onChange, webStyle, style, placeholder = 'mm/dd/yyyy' }: DateInputProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'web') {
    return (
      // @ts-ignore -- react-native-web passes unknown host tags straight to the DOM
      <input type="date" value={value} onChange={(e: any) => onChange(e.target.value)} style={webStyle} />
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
            value={parseISODate(value)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_event, date) => {
              setOpen(Platform.OS === 'ios');
              if (date) onChange(formatISODate(date));
            }}
          />
          {/* Android's 'default' display is a self-dismissing dialog; iOS's
              inline 'spinner' has no built-in close affordance, so it would
              otherwise stay open forever with no way to dismiss it. */}
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
    minWidth: 140,
    minHeight: 40,
    justifyContent: 'center',
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
});
