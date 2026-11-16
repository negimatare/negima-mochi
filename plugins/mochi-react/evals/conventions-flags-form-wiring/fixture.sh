#!/usr/bin/env bash
# ProfileForm uses React Hook Form and Zod, but repeats its schema in a
# hand-written interface, renders an input outside a Fluent Field with its
# own error span, hard-codes English in the schema, and keeps a separate
# saving flag.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src/features/profile/components/ProfileForm
cat > package.json <<'X'
{ "name": "profile", "private": true, "dependencies": { "@fluentui/react-components": "^9.0.0", "@hookform/resolvers": "^5.0.0", "react": "^19.0.0", "react-dom": "^19.0.0", "react-hook-form": "^7.0.0", "react-i18next": "^17.0.0", "zod": "^4.0.0" } }
X
cat > CLAUDE.md <<'X'
# Profile

A React + Fluent UI v9 app in TypeScript, styled with Griffel, translated
with react-i18next.
X
cat > src/features/profile/components/ProfileForm/ProfileForm.tsx <<'X'
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input } from "@fluentui/react-components";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

const profileSchema = z.object({
    displayName: z.string().min(1, { error: "Name is required" }),
    email: z.email({ error: "Enter a valid email" }),
});

interface ProfileValues {
    displayName: string;
    email: string;
}

export const ProfileForm = ({ onSave }: { onSave: (values: ProfileValues) => Promise<void> }) => {
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const { register, handleSubmit, formState } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) });

    const submit = handleSubmit(async (values) => {
        setIsSaving(true);
        await onSave(values);
        setIsSaving(false);
    });

    return (
        <form onSubmit={submit}>
            <Field label={t("profile.displayName")}>
                <Input {...register("displayName")} />
            </Field>
            <Input {...register("email")} placeholder={t("profile.email")} />
            {formState.errors.email && <span className="error">{formState.errors.email.message}</span>}
            <Button type="submit" disabled={isSaving}>{t("profile.save")}</Button>
        </form>
    );
};
X
cat > src/features/profile/components/ProfileForm/index.ts <<'X'
export { ProfileForm } from "./ProfileForm";
X
git add -A && git commit -q -m "feat: profile form"
