# Language System Documentation

## 🌍 Adding New Languages

This system is designed to make adding new languages extremely easy. Follow these steps:

### 1. Add Language Configuration

In `constants/languages.ts`, add your new language to the `languages` array:

```typescript
{
  code: 'fr',           // ISO 639-1 language code
  name: 'French',       // English name
  nativeName: 'Français', // Native name (how speakers call it)
  flag: '🇫🇷'          // Flag emoji
}
```

### 2. Update Routing Configuration

In `i18n/routing.ts`, add the language code to `supportedLocales`:

```typescript
export const supportedLocales = ["sv", "en", "fr"] as const;
```

### 3. Create Translation File

Create a new file in `messages/` folder:

- `messages/fr.json` (copy from `en.json` and translate)

### 4. That's it!

The language will automatically appear in all language switchers throughout the app.

## 🎯 Components

### LanguageSwitcher

- **Location**: Desktop sidebar
- **Style**: Full width with flag, native name, and dropdown
- **Features**: Shows current selection, smooth animations

### LanguageSwitcherCompact

- **Location**: Mobile sidebar, top navigation
- **Style**: Compact with flag and language code
- **Features**: Space-efficient for mobile use

### TopNavigation

- **Location**: Can be added to any page header
- **Style**: Right-aligned with label
- **Features**: Clean integration with page layouts

## 🔧 Language Detection

The system automatically:

1. Detects user's browser language preference
2. Falls back to Swedish (default locale)
3. Persists language choice via URL
4. Supports server-side rendering

## 📱 UX Features

- **Visual Feedback**: Current language highlighted with dot indicator
- **Accessibility**: Proper aria-labels and keyboard navigation
- **Click Outside**: Dropdown closes when clicking elsewhere
- **Smooth Transitions**: Animated dropdown and transitions
- **Flag Icons**: Visual language identification
- **Native Names**: Languages shown in their own script

## 🚀 Future Extensions

Easy to add:

- **RTL Support**: For Arabic, Hebrew, etc.
- **Region Variants**: en-US, en-GB, fr-CA, etc.
- **Currency/Date Formats**: Automatic localization
- **Keyboard Shortcuts**: Quick language switching
- **Language Auto-Detection**: Based on user location
