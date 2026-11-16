#!/usr/bin/env bash
# PromoBanner styles break three Griffel rules and nothing else.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-web.sh"
mkdir -p src/features/orders/components/PromoBanner
cat > src/features/orders/components/PromoBanner/usePromoBannerStyles.styles.ts <<'X'
import { makeStyles, shorthands, tokens } from "@fluentui/react-components";

export const useRootStyles = makeStyles({
    root: { ...shorthands.border("1px", "solid", tokens.colorNeutralStroke1), borderRadius: "999px", padding: tokens.spacingHorizontalM },
});

export const useIconStyles = makeStyles({
    icon: { color: tokens.colorBrandForeground1 },
});
X
cat > src/features/orders/components/PromoBanner/PromoBanner.tsx <<'X'
import { Text } from "@fluentui/react-components";
import { MegaphoneRegular } from "@fluentui/react-icons";
import { useIconStyles, useRootStyles } from "./usePromoBannerStyles.styles";

export const PromoBanner = ({ message }: { message: string }) => {
    const root = useRootStyles();
    const icon = useIconStyles();
    return (
        <div className={root.root}>
            <MegaphoneRegular aria-hidden className={icon.icon} />
            <Text>{message}</Text>
        </div>
    );
};
X
echo 'export { PromoBanner } from "./PromoBanner";' > src/features/orders/components/PromoBanner/index.ts
git add -A && git commit -q -m "feat: shop web"
