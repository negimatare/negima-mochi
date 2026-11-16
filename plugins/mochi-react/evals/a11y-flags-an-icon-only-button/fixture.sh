#!/usr/bin/env bash
# OrderActions has an icon-only delete button with no aria-label; its edit button has text.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-web.sh"
mkdir -p src/features/orders/components/OrderActions
cat > src/features/orders/components/OrderActions/OrderActions.tsx <<'X'
import { Button } from "@fluentui/react-components";
import { DeleteRegular, EditRegular } from "@fluentui/react-icons";

export const OrderActions = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => (
    <div>
        <Button icon={<EditRegular />} onClick={onEdit}>
            Edit
        </Button>
        <Button icon={<DeleteRegular />} onClick={onDelete} />
    </div>
);
X
echo 'export { OrderActions } from "./OrderActions";' > src/features/orders/components/OrderActions/index.ts
git add -A && git commit -q -m "feat: shop web"
