# חבילת המותג TZIR Delivery V5

החבילה בנויה לשימוש מיידי באתר, WhatsApp Business, Google Business Profile, Instagram, שיתוף קישורים ודפוס.

## הבחירה המהירה

- לוגו ראשי על רקע בהיר: `logos/svg/tzir-logo-horizontal-color.svg`
- לוגו על רקע כהה: `logos/svg/tzir-logo-horizontal-white.svg`
- הסמל בלבד: `logos/svg/tzir-symbol-color.svg`
- תמונת פרופיל WhatsApp: `whatsapp/whatsapp-profile-640.png`
- כרטיס ביקור לשליחה: `whatsapp/whatsapp-business-card-1080x1350.jpg`
- רקע WhatsApp: `whatsapp/whatsapp-wallpaper-premium-1440x2560.jpg`
- לוגו Google Business: `google/google-business-logo-720.png`
- בקשת ביקורת Google: `google/google-review-request-1080x1350.jpg`
- תמונת פרופיל Instagram: `instagram/instagram-profile-1080.png`
- פוסט Instagram: `instagram/instagram-feed-1080x1350.jpg`
- Story ו-WhatsApp Status: `instagram/instagram-story-1080x1920.jpg`
- פאביקון WordPress: `favicon/site-icon-512.png`
- פאביקון לקוד האתר: `favicon/favicon.ico` ו-`favicon/favicon.svg`

## מבנה החבילה

- `logos/svg`: קובצי וקטור לעריכה, שילוט ודפוס.
- `logos/png`: לוגואים שקופים בגדלים שימושיים.
- `favicon`: כל האייקונים הנדרשים לאתר, Apple ו-PWA.
- `whatsapp`: פרופיל, כרטיס ביקור, Status ושני רקעים.
- `google`: לוגו, כרטיס בקשת ביקורת ושכבת מיתוג לצילום אמיתי.
- `instagram`: פרופיל, פוסט, Story ושש עטיפות Highlights.
- `social`: Open Graph וקובצי Cover כלליים.
- `print`: כרטיס ביקור קדמי ואחורי עם גלישה, 300 DPI.
- `copy`: טקסטים מוכנים להעתקה.
- `ASSET-MANIFEST.csv`: רשימת כל הקבצים, המטרה והמידות.
- `TZIR-BRAND-SHEET.png`: לוח מותג מהיר.

## כללי שימוש

1. על רקע לבן או בהיר משתמשים בלוגו הצבעוני.
2. על רקע כחול כהה או צילום משתמשים בלוגו הלבן.
3. בפרופילים עגולים משתמשים בסמל בלבד. אין להשתמש בלוגו האופקי.
4. לא מותחים, לא משנים יחס, לא מוסיפים צל ולא מחליפים צבעים.
5. משאירים סביב הלוגו שטח פנוי בגובה של לפחות אחד משני פסי הסמל.
6. גודל מינימלי מומלץ: 24 פיקסלים לסמל ו-140 פיקסלים ללוגו האופקי.

## צבעים

- Navy: `#07162C`
- Blue: `#145DDB`
- Light Blue: `#5AA0FF`
- Ice: `#E8F1FF`
- Paper: `#F7F9FC`
- WhatsApp CTA: `#08786C`

## טיפוגרפיה

הגופן הראשי הוא Heebo. הכותרות משתמשות במשקל 800, טקסטים מודגשים במשקל 600 וטקסט רץ במשקל 400. קובצי הגופן ורישיון SIL Open Font License נמצאים ב-`source/fonts`.

הטקסט בכל קובצי הלוגו מסוג SVG הומר לקווי מתאר. לכן הלוגו ייפתח נכון גם במחשב שלא מותקן בו Heebo.

## Google Business

יש להעלות את `google-business-logo-720.png` כלוגו.

לתמונת Cover מומלץ להשתמש בצילום אמיתי של שליח, צוות או ביצוע מסירה. החבילה כוללת שכבה שקופה בשם `google-real-photo-overlay-template-720.png`. מניחים אותה מעל צילום אמיתי, בפינה, ולא מעלים אותה לבדה.

אין להשתמש ברקע העירוני שנוצר לחומרים השיווקיים כתמונת Cover של Google. הוא מיועד ל-WhatsApp, Instagram, מצגות ופרסום.

## התקנת הפאביקון ב-WordPress

בלוח הבקרה:

`עיצוב > התאמה אישית > פרטי האתר > סמל האתר`

מעלים את `favicon/site-icon-512.png`.

אם התוסף V5 מגיש את האתר ישירות, אפשר להשתמש גם ב-`favicon/favicon.ico` וב-`favicon/favicon.svg` בקוד או בחבילת התוסף.
