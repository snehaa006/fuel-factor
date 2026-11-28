import { View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * A flat card with a thick outline and a solid offset shadow, so it reads as
 * a printed card lying on another -- the look of the fun fact and the mini
 * quiz. No gradients, no blur: one colour for the card, one for the card
 * behind it.
 */
export function StackCard({
  children,
  color,
  shadow,
  border,
  offset = 8,
  radius = 26,
  style,
  testID,
}: {
  children: React.ReactNode;
  color: string;
  shadow: string;
  border: string;
  offset?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View style={[{ paddingRight: offset, paddingBottom: offset }, style]} testID={testID}>
      <View
        style={[
          {
            position: 'absolute',
            right: 0,
            bottom: 0,
            left: offset,
            top: offset,
            backgroundColor: shadow,
            borderColor: border,
            borderWidth: 2,
            borderRadius: radius,
          },
        ]}
      />
      <View
        style={{
          backgroundColor: color,
          borderColor: border,
          borderWidth: 2.5,
          borderRadius: radius,
          overflow: 'hidden',
          flexShrink: 1,
        }}
      >
        {children}
      </View>
    </View>
  );
}
