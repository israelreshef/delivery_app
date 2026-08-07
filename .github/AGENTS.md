# 🤖 Local Ollama Agents

זה הקובץ הראשי של ה-Agents המחוברים לשרת ה-Ollama המקומי שלך.

## 🎯 הגדרה כללית

כל Agent דיבור עם מודל מקומי שונה דרך ה-MCP Bridge. זה מאפשר לך:
- 💬 **שלוש חלונות chat נפרדים** - כל אחד עם Agent אחר
- 🔄 **שיחה רציפה** - כמו דיבור עם Copilot רגיל
- 🚀 **מודלים מקומיים** - לא תלויים בAPI חיצוני

---

## 📋 ה-Agents

### 1️⃣ **איה** (`aia.agent.md`)
- **מודל**: AYA8B (8B Parameters)
- **מיוחדות**: עברית, תכנון, brainstorming
- **דוגמא**: "בואו נתכנן את ה-Payment System"

### 2️⃣ **קווין** (`qwen.agent.md`)
- **מודל**: Qwen2.5-Coder (7.6B Parameters, 32K context)
- **מיוחדות**: קוד, debugging, refactoring, optimization
- **דוגמא**: "כתוב לי Payment API ב-Python"

### 3️⃣ **ללאמה** (`llama.agent.md`)
- **מודל**: LLaMA3 8B Instruct (8B Parameters)
- **מיוחדות**: חשיבה עמוקה, ניתוח, דיונים
- **דוגמא**: "תן לי ניתוח SWOT של הפרוייקט"

---

## 🚀 איך להשתמש

### דרך 1: Slash Command בחלון אחר
1. פתח חלון Copilot חדש (+ לידו של הטאב)
2. הקלד `/` ותבחר באחד הAgents
3. או הקלד `/aia` / `/qwen` / `/llama`

### דרך 2: מחליף Agent
בחלון הנוכחי, אתה יכול לדבר עם Agent שונה בכל פעם - אבל Slash Commands יותר נוח.

---

## 🔧 מידע טכני

### MCP Server
```
Location: ./mcp_server/mcp_server.py
Status: Running (detached)
Ollama URL: http://localhost:11434
```

### Tools Available
- `aya_general` - שיחה כללית עם AYA
- `qwen_code` - כתיבת/תיקון קוד עם Qwen
- `llama_general` - שיחה כללית עם LLaMA

---

## 📝 דוגמאות שימוש

### יותר קוד עם קווין
```
אתה: "כתוב לי REST API עבור Payment System ב-Flask"
קווין: [כותב קוד מלא עם טעויות בודקות]
```

### ברינסטורמינג עם איה
```
אתה: "איך אנחנו צריכים לתכנן את ה-Infrastructure?"
איה: [תוכנית מפורטת בעברית]
```

### ניתוח עם ללאמה
```
אתה: "מה הבעיות בארכיטקטורה הנוכחית?"
ללאמה: [ניתוח עמוק של הפרוייקט]
```

---

## ⚠️ הערות חשובות

1. **Ollama חייב להיות פעיל** - בדוק ב- `http://localhost:11434/api/tags`
2. **MCP Server חייב להיות running** - הוא מופעל ב-mode detached
3. **Latency** - המודלים המקומיים יותר איטיים מ-API קלאוד
4. **Context limits** - כל מודל יש context limit משלו (8K-32K tokens)

---

## 🔗 Integration Points

- **`.github/agents/aia.agent.md`** - AYA Agent definition
- **`.github/agents/qwen.agent.md`** - Qwen Agent definition
- **`.github/agents/llama.agent.md`** - LLaMA Agent definition
- **`./mcp_server/mcp_server.py`** - MCP Bridge to Ollama
- **`./mcp_server/.venv/`** - Python dependencies (requests, mcp)

---

**תיעוד עדכנה לאחרונה**: 2026-07-10
