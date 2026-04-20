# -*- coding: utf-8 -*-
import re

path = 'src/main/java/com/tzir/delivery/courier/ui/courier/RoutePlannerScreen.kt'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def fix_line(line_num, old_fragment, new_fragment):
    """Replace a fragment on a specific line (1-indexed)."""
    idx = line_num - 1
    if idx < len(lines) and old_fragment in lines[idx]:
        lines[idx] = lines[idx].replace(old_fragment, new_fragment)
        print(f"  L{line_num}: OK")
        return True
    else:
        print(f"  L{line_num}: skip (fragment not found)")
        return False

# Now, let's find ALL lines that have Hebrew-looking gibberish and replace entire quoted strings
# Strategy: find every string literal that contains the mojibake chars
count = 0
for i, line in enumerate(lines):
    ln = i + 1
    changed = False
    
    # Line-specific replacements based on what we saw in the file
    if ln == 263:
        lines[i] = lines[i].split('"')[0] + '"' + '\u05dc\u05d0 \u05e0\u05d9\u05ea\u05df \u05dc\u05e7\u05d1\u05dc \u05de\u05d9\u05e7\u05d5\u05dd \u05e0\u05d5\u05db\u05d7\u05d9' + '")\n'
        changed = True
    elif ln == 303:
        lines[i] = lines[i].split('"')[0] + '"' + '\u05dc\u05d0 \u05e0\u05d9\u05ea\u05df \u05dc\u05d0\u05de\u05ea \u05d0\u05ea \u05d4\u05db\u05ea\u05d5\u05d1\u05ea' + '")\n'
        changed = True
    elif ln == 337:
        # "${stops.size} עצירות"
        lines[i] = '                                "${stops.size} \u05e2\u05e6\u05d9\u05e8\u05d5\u05ea",\n'
        changed = True
    elif ln == 350:
        # "מוטב"
        lines[i] = '                                    Text("\u05de\u05d5\u05d8\u05d1", color = SoftMint, fontSize = 11.sp, fontWeight = FontWeight.Medium)\n'
        changed = True
    elif ln == 426:
        # snackbar optimization success
        lines[i] = '                                            snackbarHostState.showSnackbar("\u05d4\u05de\u05e1\u05dc\u05d5\u05dc \u05de\u05d5\u05d8\u05d1 - ${result.totalDistanceKm.let { "%.1f".format(it) }} \u05e7\u05de")\n'
        changed = True
    elif ln == 428:
        # snackbar optimization failure
        lines[i] = '                                            snackbarHostState.showSnackbar("\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05d0\u05d5\u05e4\u05d8\u05d9\u05de\u05d9\u05d6\u05e6\u05d9\u05d4, \u05e0\u05e1\u05d4 \u05e9\u05d5\u05d1")\n'
        changed = True
    elif ln == 455:
        # "המסלול נשמר ללוח השנה!"
        lines[i] = '                                            snackbarHostState.showSnackbar("\u05d4\u05de\u05e1\u05dc\u05d5\u05dc \u05e0\u05e9\u05de\u05e8 \u05dc\u05dc\u05d5\u05d7 \u05d4\u05e9\u05e0\u05d4!")\n'
        changed = True
    elif ln == 527:
        # contentDescription = "מיקום נוכחי"
        lines[i] = '                contentDescription = "\u05de\u05d9\u05e7\u05d5\u05dd \u05e0\u05d5\u05db\u05d7\u05d9",\n'
        changed = True
    elif ln == 761:
        # "איסוף" / "מסירה"
        lines[i] = '                if (stop.stopType == "pickup") "\u05d0\u05d9\u05e1\u05d5\u05e3" else "\u05de\u05e1\u05d9\u05e8\u05d4",\n'
        changed = True
    elif ln == 875:
        # "סוג עצירה"
        lines[i] = '            Text("\u05e1\u05d5\u05d2 \u05e2\u05e6\u05d9\u05e8\u05d4", color = TextSecondary, fontSize = 13.sp)\n'
        changed = True
    elif ln == 877:
        # "מסירה" / "איסוף"
        lines[i] = '                listOf("\u05de\u05e1\u05d9\u05e8\u05d4" to "delivery", "\u05d0\u05d9\u05e1\u05d5\u05e3" to "pickup").forEach { (label, value) ->\n'
        changed = True
    elif ln == 952:
        # "הסרה"
        lines[i] = '                Text("\u05d4\u05e1\u05e8\u05d4", color = Danger, fontSize = 14.sp, fontWeight = FontWeight.Medium)\n'
        changed = True
    elif ln == 976:
        # "אישור"
        lines[i] = '                Text("\u05d0\u05d9\u05e9\u05d5\u05e8", color = SoftMint, fontSize = 14.sp, fontWeight = FontWeight.Bold)\n'
        changed = True
    elif ln == 987:
        # "הסרת עצירה"
        lines[i] = '            title = { Text("\u05d4\u05e1\u05e8\u05ea \u05e2\u05e6\u05d9\u05e8\u05d4", color = TextPrimary, fontWeight = FontWeight.Bold) },\n'
        changed = True
    elif ln == 988:
        # "להסיר את העצירה מהמסלול?"
        lines[i] = '            text = { Text("\u05dc\u05d4\u05e1\u05d9\u05e8 \u05d0\u05ea \u05d4\u05e2\u05e6\u05d9\u05e8\u05d4 \u05de\u05d4\u05de\u05e1\u05dc\u05d5\u05dc?", color = TextSecondary) },\n'
        changed = True
    elif ln == 991:
        # "הסר"
        lines[i] = '                TextButton(onClick = { showRemoveConfirm = false; onRemove() }) {\n'
        # skip, fix next line
    elif ln == 992 or (ln == 991 and False):
        pass  # handled below
    elif ln == 996:
        # "ביטול"
        lines[i] = '                    Text("\u05d1\u05d9\u05d8\u05d5\u05dc", color = TextSecondary)\n'
        changed = True
    elif ln == 1048:
        # "מחשב מסלול..."
        lines[i] = '                Text("\u05de\u05d7\u05e9\u05d1 \u05de\u05e1\u05dc\u05d5\u05dc...", color = SoftMint, fontSize = 14.sp)\n'
        changed = True
    elif ln == 1060:
        # "מטב מחדש" / "אופטימיזציה למסלול"
        lines[i] = '                    if (isOptimized) "\u05de\u05d8\u05d1 \u05de\u05d7\u05d3\u05e9" else "\u05d0\u05d5\u05e4\u05d8\u05d9\u05de\u05d9\u05d6\u05e6\u05d9\u05d4 \u05dc\u05de\u05e1\u05dc\u05d5\u05dc",\n'
        changed = True
    elif ln == 1096:
        # "שמור מסלול"
        lines[i] = '                "\u05e9\u05de\u05d5\u05e8 \u05de\u05e1\u05dc\u05d5\u05dc",\n'
        changed = True
    elif ln == 1134:
        # "חפשו כתובת להתחלה"
        lines[i] = '            "\u05d7\u05e4\u05e9\u05d5 \u05db\u05ea\u05d5\u05d1\u05ea \u05dc\u05d4\u05ea\u05d7\u05dc\u05d4",\n'
        changed = True
    elif ln == 1141:
        # "הקלידו בשורת החיפוש למעלה"
        lines[i] = '            "\u05d4\u05e7\u05dc\u05d9\u05d3\u05d5 \u05d1\u05e9\u05d5\u05e8\u05ea \u05d4\u05d7\u05d9\u05e4\u05d5\u05e9 \u05dc\u05de\u05e2\u05dc\u05d4",\n'
        changed = True
    
    if changed:
        count += 1

# Also fix line 991 - "הסר"
for i, line in enumerate(lines):
    if i + 1 == 991:
        # The line has the "הסר" button text but it's already structured
        # Let's check if it needs fixing
        break

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"Done. Fixed {count} lines.")
