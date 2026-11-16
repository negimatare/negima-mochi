#!/usr/bin/env bash
# useCustomer already tracks loading and errors with separate flags, a neighbour to copy.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-web.sh"
mkdir -p src/features/customers/hooks
cat > src/features/customers/hooks/useCustomer.ts <<'X'
import { useEffect, useState } from "react";
import type { Customer } from "../domain/customer";

export const useCustomer = (id: string) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);
    useEffect(() => {
        fetch(`/api/customers/${id}`)
            .then((response) => response.json())
            .then(setCustomer, setError)
            .finally(() => setIsLoading(false));
    }, [id]);
    return { isLoading, error, customer };
};
X
git add -A && git commit -q -m "feat: shop web"
