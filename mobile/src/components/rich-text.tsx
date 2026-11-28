import { Text, type StyleProp, type TextStyle } from 'react-native';

/**
 * A sentence with its key words highlighted.
 *
 * The fun facts mark the words that matter **like this** (seed 0021); this
 * draws them bold, in colour, on a soft band -- so a glance picks out the
 * number and the food. Nothing else is parsed: an unclosed mark shows as
 * written rather than swallowing the rest of the sentence.
 */
export type Span = { text: string; strong: boolean };

export function spansOf(source: string): Span[] {
  const parts = source.split('**');
  // An odd number of marks means one is unclosed: show the text as written.
  if (parts.length % 2 === 0) return [{ text: source, strong: false }];
  return parts
    .map((text, i) => ({ text, strong: i % 2 === 1 }))
    .filter((span) => span.text !== '');
}

export function RichText({
  text,
  style,
  strongStyle,
  testID,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  strongStyle?: StyleProp<TextStyle>;
  testID?: string;
}) {
  return (
    <Text style={style} testID={testID}>
      {spansOf(text).map((span, i) =>
        span.strong ? (
          <Text key={i} style={strongStyle}>
            {span.text}
          </Text>
        ) : (
          span.text
        )
      )}
    </Text>
  );
}
