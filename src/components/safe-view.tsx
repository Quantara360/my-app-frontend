import React from 'react';
import { View, Text, type ViewProps } from 'react-native';

/**
 * Drop-in replacement for <View> that guards against the React Native
 * invariant "Text strings must be rendered within a <Text> component."
 *
 * That warning only fires on the native (Fabric) renderer - React Native
 * Web silently accepts raw text as a <div> child, so this class of bug is
 * invisible when testing on web and only crashes on-device. Mirrors the
 * same defensive wrapping already applied in ThemedView (see
 * themed-view.tsx) for screens that use plain View instead.
 */
export function SafeView({ children, ...otherProps }: ViewProps) {
  const processedChildren = React.Children.map(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      return <Text>{child}</Text>;
    }
    return child;
  });

  return <View {...otherProps}>{processedChildren}</View>;
}
