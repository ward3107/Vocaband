import json
import sys

# Set UTF-8 encoding for output
sys.stdout.reconfigure(encoding='utf-8')

# File paths
translated_json = r'C:\Users\Waseem\Downloads\Vocaband\src\band2_words_translated.json'
vocabulary_ts = r'C:\Users\Waseem\Downloads\Vocaband\src\vocabulary.ts'

print("="*80)
print("CONVERTING TRANSLATED JSON TO TYPESCRIPT")
print("="*80)

# Load the translated words
with open(translated_json, 'r', encoding='utf-8') as f:
    words = json.load(f)

# Check translation completion
complete_count = sum(1 for w in words if w.get('hebrew') and w.get('arabic'))
print(f"\nTotal words: {len(words)}")
print(f"Fully translated: {complete_count} ({complete_count/len(words)*100:.1f}%)")

if complete_count < len(words):
    missing = len(words) - complete_count
    print(f"WARNING: {missing} words still missing translations!")
    response = input("Continue anyway? (y/n): ")
    if response.lower() != 'y':
        print("Aborted. Waiting for translation to complete...")
        sys.exit(1)

# Separate by core
core_i_words = [w for w in words if w['core'] == 'Core I']
core_ii_words = [w for w in words if w['core'] == 'Core II']

print(f"\nCore I: {len(core_i_words)} words")
print(f"Core II: {len(core_ii_words)} words")

# Generate TypeScript code
def generate_ts_code(words, core_name):
    lines = [f"// BAND 2 - {core_name}"]
    lines.append(f"// Auto-generated from curriculum - {len(words)} words")
    lines.append(f"// Generated: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append(f"export const BAND_2_CORE_{core_name.replace(' ', '')}_WORDS: Word[] = [")

    for word in words:
        if not word.get('hebrew') or not word.get('arabic'):
            print(f"WARNING: Missing translation for '{word['english']}'")
            hebrew = word.get('hebrew', '""')
            arabic = word.get('arabic', '""')
        else:
            hebrew = f'"{word["hebrew"]}"'
            arabic = f'"{word["arabic"]}"'

        # Build the word object
        parts = [
            f"id: {word['id']}",
            f'english: "{word["english"]}"',
            f"hebrew: {hebrew}",
            f"arabic: {arabic}",
            f'level: "Band 2"',
            f'core: "{word["core"]}"'
        ]

        if word.get('pos'):
            parts.append(f'pos: "{word["pos"]}"')
        if word.get('recProd'):
            parts.append(f'recProd: "{word["recProd"]}"')

        line = f"  {{ {', '.join(parts)} }},"
        lines.append(line)

    lines.append("];")
    lines.append("")
    return '\n'.join(lines)

# Generate the complete file
print("\nGenerating TypeScript code...")

ts_content = f"""// vocabulary.ts
// Auto-generated from Band 2 curriculum
// Generated: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}
// Total words: {len(words)}

export interface Word {{
  id: number;
  english: string;
  hebrew: string;
  arabic: string;
  imageUrl?: string;
  level?: "Band 1" | "Band 2" | "Band 3" | "Custom";
  core?: "Core I" | "Core II";
  pos?: string; // Part of Speech
  recProd?: "Rec" | "Prod"; // Receptive or Productive
}}

// ============================================================================
// BAND 2 - CORE I ({len(core_i_words)} words)
// ============================================================================
{generate_ts_code(core_i_words, 'CORE I')}

// ============================================================================
// BAND 2 - CORE II ({len(core_ii_words)} words)
// ============================================================================
{generate_ts_code(core_ii_words, 'CORE II')}

// ============================================================================
// ALL BAND 2 WORDS (Combined)
// ============================================================================
export const BAND_2_WORDS: Word[] = [
  ...BAND_2_CORE_I_WORDS,
  ...BAND_2_CORE_II_WORDS
];

export const ALL_WORDS: Word[] = BAND_2_WORDS;
"""

# Write to vocabulary.ts
with open(vocabulary_ts, 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f"\n✓ Successfully updated: {vocabulary_ts}")
print(f"✓ Core I: {len(core_i_words)} words")
print(f"✓ Core II: {len(core_ii_words)} words")
print(f"✓ Total: {len(words)} words")
print("\nThe app will now use the new Band 2 vocabulary!")
