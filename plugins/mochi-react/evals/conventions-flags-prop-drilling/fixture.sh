#!/usr/bin/env bash
# SettingsPage receives `language`; SettingsLayout, SettingsSection, and
# LanguageGroup only pass it on until LanguageBadge reads it. Nothing else in
# the slice breaks a convention.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
C=src/features/settings/components
mkdir -p $C/SettingsPage $C/SettingsLayout $C/SettingsSection $C/LanguageGroup $C/LanguageBadge
cat > package.json <<'X'
{ "name": "settings", "private": true, "dependencies": { "@fluentui/react-components": "^9.0.0", "react": "^19.0.0", "react-dom": "^19.0.0" } }
X
cat > CLAUDE.md <<'X'
# Settings

A React + Fluent UI v9 app in TypeScript, styled with Griffel.
X
cat > $C/SettingsPage/SettingsPage.tsx <<'X'
import { SettingsLayout } from "../SettingsLayout";

export const SettingsPage = ({ language }: { language: string }) => <SettingsLayout language={language} />;
X
cat > $C/SettingsLayout/SettingsLayout.tsx <<'X'
import { SettingsSection } from "../SettingsSection";

export const SettingsLayout = ({ language }: { language: string }) => (
    <main>
        <SettingsSection language={language} />
    </main>
);
X
cat > $C/SettingsSection/SettingsSection.tsx <<'X'
import { LanguageGroup } from "../LanguageGroup";

export const SettingsSection = ({ language }: { language: string }) => (
    <section>
        <LanguageGroup language={language} />
    </section>
);
X
cat > $C/LanguageGroup/LanguageGroup.tsx <<'X'
import { LanguageBadge } from "../LanguageBadge";

export const LanguageGroup = ({ language }: { language: string }) => (
    <div role="group">
        <LanguageBadge language={language} />
    </div>
);
X
cat > $C/LanguageBadge/LanguageBadge.tsx <<'X'
import { Badge } from "@fluentui/react-components";

export const LanguageBadge = ({ language }: { language: string }) => <Badge>{language.toUpperCase()}</Badge>;
X
for name in SettingsPage SettingsLayout SettingsSection LanguageGroup LanguageBadge; do
  printf 'export { %s } from "./%s";\n' "$name" "$name" > $C/$name/index.ts
done
git add -A && git commit -q -m "feat: settings"
