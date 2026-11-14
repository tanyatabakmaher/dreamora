# Dreamora (יעד)

אפליקציית מעקב חיסכון לפי מטרות. עברית, RTL. JavaScript רגיל עם מודולים של הדפדפן, בלי שלב בנייה.

האתר: https://tanyatabakmaher.github.io/dreamora/

## מבנה

```
index.html              שלד + טעינת CSS ומודולים
styles/
  tokens.css            צבעים, מרווחים, רדיוסים (Pastel Atelier). מקור האמת היחיד לעיצוב
  base.css              איפוס וטיפוגרפיה
  ui/*.css              סגנונות ליחידות חוזרות: button, field, message, modal, toast, brand
  auth.css, goals.css   סגנונות למסכים
src/
  main.js               נקודת כניסה: בוחר בין מסך התחברות למסך המטרות
  config.js             מצב (supabase / demo), כתובת הפרויקט והמפתח הציבורי
  strings.js            כל הטקסטים בעברית
  data/tracks.js        מסלולי השקעה ואימוג'י מוצעים
  lib/                  calc.js (חישובי ריבית דריבית), format.js, dom.js, image.js
  services/             auth.js, goalsRepo.js, supabaseClient.js (לכל שירות שני מימושים: demo ו-supabase)
  components/
    ui/                 יחידות חוזרות: Button, Field, PasswordField, Message, Modal, Toast, Logo
    Gauge, GoalCard, GoalList, GoalForm, IconPicker, PlanSummary, ConfirmDialog
    AppHeader (brand bar), ProfileDialog; ui/Avatar, ui/Menu (add menu items there)
    Welcome, AuthForm, AuthScreen, GoalsScreen
tests/                 בדיקות: חישובים, מד, ולידציה, סימון שיתוף
supabase/              סכמות SQL (001 מטרות, 002 פרופילים, 003 נראות ומשתתפים) עם הרשאות RLS
```

## כללים לעדכון

- שינוי צבע או רדיוס או מרווח: רק ב-`styles/tokens.css`.
- שינוי מראה של כפתור/שדה/הודעה/חלון: בקובץ ה-CSS וה-JS של היחידה ב-`ui/`, והוא מתעדכן בכל האפליקציה.
- שינוי טקסט: `src/strings.js`.
- החלפת ספק נתונים: מימוש חדש ב-`services/` באותו ממשק.
- הרצה מקומית: `npm run serve` ואז http://localhost:8000. בדיקות: `npm test`.

האפליקציה היא כלי מעקב בלבד ואינה ייעוץ השקעות.
