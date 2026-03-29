import json
import time
import sys
from deep_translator import GoogleTranslator

# Set UTF-8 encoding for output
sys.stdout.reconfigure(encoding='utf-8')

# Load the words
input_file = r'C:\Users\Waseem\Downloads\Vocaband\src\band2_words_to_translate.json'
output_file = r'C:\Users\Waseem\Downloads\Vocaband\src\band2_words_translated.json'

print("="*80)
print("TRANSLATING BAND 2 VOCABULARY TO HEBREW AND ARABIC")
print("="*80)

with open(input_file, 'r', encoding='utf-8') as f:
    words = json.load(f)

print(f"\nTotal words to translate: {len(words)}")
print("This will take approximately 10-20 minutes...")
print("Please wait...\n")

# Initialize translators (Hebrew uses 'iw' as language code)
translator_he = GoogleTranslator(source='en', target='iw')
translator_ar = GoogleTranslator(source='en', target='ar')

# Create a backup first
backup_file = input_file + '.backup'
with open(backup_file, 'w', encoding='utf-8') as f:
    json.dump(words, f, ensure_ascii=False, indent=2)
print(f"Backup created: {backup_file}\n")

# Translate each word
translated_count = 0
for i, word in enumerate(words):
    if not word['hebrew'] or not word['arabic']:
        english = word['english']

        # Skip if already has translations (for resuming)
        if not word['hebrew']:
            try:
                # Translate to Hebrew
                word['hebrew'] = translator_he.translate(english)
                time.sleep(0.2)  # Rate limiting
            except Exception as e:
                print(f"Error translating '{english}' to Hebrew: {e}")
                word['hebrew'] = ""

        if not word['arabic']:
            try:
                # Translate to Arabic
                word['arabic'] = translator_ar.translate(english)
                time.sleep(0.2)  # Rate limiting
            except Exception as e:
                print(f"Error translating '{english}' to Arabic: {e}")
                word['arabic'] = ""

        translated_count += 1

        # Save progress every 50 words
        if (i + 1) % 50 == 0:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(words, f, ensure_ascii=False, indent=2)
            print(f"Progress: {i + 1}/{len(words)} words translated ({(i+1)/len(words)*100:.1f}%)")

        # Show every 10th word
        if (i + 1) % 10 == 0:
            print(f"  [{i + 1}] {english} → Hebrew: {word['hebrew'][:30]}... | Arabic: {word['arabic'][:30]}...")

# Final save
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(words, f, ensure_ascii=False, indent=2)

print("\n" + "="*80)
print("TRANSLATION COMPLETE!")
print("="*80)
print(f"Translated: {translated_count} words")
print(f"Output file: {output_file}")

# Show sample results
print("\nSample translations:")
print("-"*80)
for word in words[:5]:
    print(f"  EN: {word['english']}")
    print(f"  HE: {word['hebrew']}")
    print(f"  AR: {word['arabic']}")
    print(f"  Core: {word['core']}")
    print("-"*80)
