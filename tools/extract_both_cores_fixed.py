import pandas as pd
import json
import sys

# Set UTF-8 encoding for output
sys.stdout.reconfigure(encoding='utf-8')

# File paths - CORRECTED
core1_file = r'c:\Users\Waseem\Documents\PDFgear\LexicalBand2 conv 2.xls'  # Has the actual Core I words
core2_file = r'c:\Users\Waseem\Desktop\core2.xlsx'

print("="*80)
print("EXTRACTING BAND 2 VOCABULARY - CORE I & CORE II")
print("="*80)

# Read Core I (2491 rows)
df1 = pd.read_excel(core1_file)

# Read Core II (1239 rows)
df2 = pd.read_excel(core2_file)

all_words = []
current_id = 1

# Process Core I
print("\nProcessing Core I...")
core1_count = 0
for i in range(3, len(df1)):  # Start from row 3 (after headers)
    english = df1.iloc[i, 0]
    if pd.notna(english) and str(english).strip():
        word = {
            "id": current_id,
            "english": str(english).strip(),
            "hebrew": "",  # TO BE TRANSLATED
            "arabic": "",  # TO BE TRANSLATED
            "pos": str(df1.iloc[i, 9]).strip() if pd.notna(df1.iloc[i, 9]) else None,
            "recProd": str(df1.iloc[i, 47]).strip() if pd.notna(df1.iloc[i, 47]) else None,
            "meaning": str(df1.iloc[i, 36]).strip() if pd.notna(df1.iloc[i, 36]) else None,
            "family": str(df1.iloc[i, 16]).strip() if pd.notna(df1.iloc[i, 16]) else None,
            "core": "Core I"
        }
        all_words.append(word)
        current_id += 1
        core1_count += 1

print(f"Extracted {core1_count} words from Core I")

# Process Core II
print("\nProcessing Core II...")
core2_count = 0
for i in range(3, len(df2)):  # Start from row 3 (after headers)
    english = df2.iloc[i, 0]
    if pd.notna(english) and str(english).strip():
        word = {
            "id": current_id,
            "english": str(english).strip(),
            "hebrew": "",  # TO BE TRANSLATED
            "arabic": "",  # TO BE TRANSLATED
            "pos": str(df2.iloc[i, 9]).strip() if pd.notna(df2.iloc[i, 9]) else None,
            "recProd": str(df2.iloc[i, 47]).strip() if pd.notna(df2.iloc[i, 47]) else None,
            "meaning": str(df2.iloc[i, 36]).strip() if pd.notna(df2.iloc[i, 36]) else None,
            "family": str(df2.iloc[i, 16]).strip() if pd.notna(df2.iloc[i, 16]) else None,
            "core": "Core II"
        }
        all_words.append(word)
        current_id += 1
        core2_count += 1

print(f"Extracted {core2_count} words from Core II")

print("\n" + "="*80)
print("SUMMARY")
print("="*80)
print(f"Core I: {core1_count} words")
print(f"Core II: {core2_count} words")
print(f"TOTAL: {len(all_words)} words")

print("\n" + "="*80)
print("SAMPLE WORDS FROM EACH CORE")
print("="*80)

print("\nCore I samples:")
for w in [w for w in all_words if w['core'] == 'Core I'][:5]:
    print(f"  {w['id']}. {w['english']} | {w['pos']} | {w['recProd']}")

print("\nCore II samples:")
for w in [w for w in all_words if w['core'] == 'Core II'][:5]:
    print(f"  {w['id']}. {w['english']} | {w['pos']} | {w['recProd']}")

# Save to JSON
output_path = r'C:\Users\Waseem\Downloads\Vocaband\src\band2_words_to_translate.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(all_words, f, ensure_ascii=False, indent=2)

print(f"\nSaved to: {output_path}")
print(f"\nReady for Hebrew and Arabic translation!")
