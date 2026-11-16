#!/usr/bin/env bash
# FontSizePicker inlines its option list, mirrors props into state through an
# effect, and keeps three independent states (size, isOpen, query) once that
# effect and the derivable preview are gone. NotificationToggle resets state
# on a prop change and notifies its parent from an effect. useWindowWidth's
# effect subscribes to an external system and is correct.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src/features/settings/components/FontSizePicker \
  src/features/settings/components/NotificationToggle src/features/settings/hooks
cat > package.json <<'X'
{ "name": "captions", "private": true, "dependencies": { "@fluentui/react-components": "^9.0.0", "react": "^19.0.0", "react-dom": "^19.0.0" } }
X
cat > CLAUDE.md <<'X'
# Captions

A React + Fluent UI v9 app in TypeScript, styled with Griffel.
X
cat > eslint.config.js <<'X'
import reactHooks from "eslint-plugin-react-hooks";

export default [
    {
        files: ["src/**/*.{ts,tsx}"],
        plugins: { "react-hooks": reactHooks },
        rules: { "react-hooks/rules-of-hooks": "error" },
    },
];
X
cat > src/features/settings/components/FontSizePicker/FontSizePicker.tsx <<'X'
import { Button, Input } from "@fluentui/react-components";
import { useEffect, useState } from "react";

type FontSizePickerProps = { userName: string; initialSize: string };

export const FontSizePicker = ({ userName, initialSize }: FontSizePickerProps) => {
    const options = [
        { value: "small", label: "Small", px: 14 },
        { value: "medium", label: "Medium", px: 16 },
        { value: "large", label: "Large", px: 18 },
        { value: "xlarge", label: "Extra large", px: 22 },
        { value: "huge", label: "Huge", px: 28 },
    ];
    const [size, setSize] = useState(initialSize);
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [greeting, setGreeting] = useState("");
    const [preview, setPreview] = useState(16);

    useEffect(() => {
        setGreeting(`Hello ${userName}`);
    }, [userName]);

    const pick = (value: string) => {
        setSize(value);
        setPreview(options.find((option) => option.value === value)?.px ?? 16);
        setIsOpen(false);
    };
    const visible = options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()));

    return (
        <section>
            <p>{greeting}</p>
            <Button onClick={() => setIsOpen(!isOpen)}>Font size: {size}</Button>
            {isOpen && (
                <>
                    <Input value={query} onChange={(_, data) => setQuery(data.value)} placeholder="Filter" />
                    {visible.map((option) => (
                        <Button key={option.value} onClick={() => pick(option.value)}>{option.label}</Button>
                    ))}
                </>
            )}
            <p style={{ fontSize: preview }}>Preview</p>
        </section>
    );
};
X
cat > src/features/settings/components/FontSizePicker/index.ts <<'X'
export { FontSizePicker } from "./FontSizePicker";
X
cat > src/features/settings/components/NotificationToggle/NotificationToggle.tsx <<'X'
import { Switch } from "@fluentui/react-components";
import { useEffect, useState } from "react";

type NotificationToggleProps = { userId: string; onNotificationsChange: (isOn: boolean) => void };

export const NotificationToggle = ({ userId, onNotificationsChange }: NotificationToggleProps) => {
    const [isOn, setIsOn] = useState(false);

    useEffect(() => {
        setIsOn(false);
    }, [userId]);

    useEffect(() => {
        onNotificationsChange(isOn);
    }, [isOn, onNotificationsChange]);

    return <Switch checked={isOn} onChange={() => setIsOn(!isOn)} label="Notifications" />;
};
X
cat > src/features/settings/components/NotificationToggle/index.ts <<'X'
export { NotificationToggle } from "./NotificationToggle";
X
cat > src/features/settings/hooks/useWindowWidth.ts <<'X'
import { useEffect, useState } from "react";

export const useWindowWidth = (): number => {
    const [width, setWidth] = useState(window.innerWidth);

    useEffect(() => {
        const onResize = () => setWidth(window.innerWidth);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    return width;
};
X
git add -A && git commit -q -m "feat: settings"
