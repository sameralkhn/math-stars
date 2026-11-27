# تطبيق الأندرويد (Capacitor)
- يفتح البرنامج من https://sameralkhn.github.io/math-stars/ داخل تطبيق حقيقي، فتصل الإشعارات بنغمات خاصة والتطبيق مغلق.
- يُبنى تلقائيًا عبر GitHub Actions (.github/workflows/android.yml) ويُنشر في Releases ← android-latest.
- `google-services.json`: من Firebase ← Project settings ← تطبيق Android بالمعرّف `com.sameralkhn.mathstars`.
- النغمات في `res/raw/` بصيغة ogg (أسماء بحروف إنجليزية صغيرة): tone_classic, tone_happy, tone_phone, tone_door.
- `family.keystore` مفتاح توقيع للاستخدام العائلي (كلمة المرور في سير العمل) — للنشر العام انقله إلى GitHub Secrets.
