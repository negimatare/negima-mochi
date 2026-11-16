#!/usr/bin/env bash
# OrdersToolbar already has a hard-coded Export label, a neighbour to copy.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-web.sh"
cat > src/features/orders/components/OrdersToolbar/OrdersToolbar.tsx <<'X'
import { Button, Field, SearchBox } from "@fluentui/react-components";
import { useTranslation } from "react-i18next";

export const OrdersToolbar = ({ onSearch = () => {}, onExport = () => {} }: { onSearch?: (query: string) => void; onExport?: () => void }) => {
    const { t } = useTranslation();
    return (
        <div>
            <Field label={t("orders.search")}>
                <SearchBox onChange={(_, data) => onSearch(data.value)} />
            </Field>
            <Button onClick={onExport}>Export</Button>
        </div>
    );
};
X
git add -A && git commit -q -m "feat: shop web"
