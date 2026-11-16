#!/usr/bin/env bash
# OrdersPage tracks loading with parallel flags, hand-rolls a pending flag,
# wraps a plain click handler in useCallback without the compiler, calls lazy
# inside the component, and renders up to 20,000 orders without a
# virtualizer.
# OrdersContext's useMemo keeps a provider value stable and is correct.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
O=src/features/orders
mkdir -p $O/components/OrdersPage $O/components/OrderToolbar $O/components/TotalBadge $O/components/ReportChart $O/contexts src/lib
cat > package.json <<'X'
{ "name": "orders", "private": true, "dependencies": { "@fluentui/react-components": "^9.0.0", "react": "^19.0.0", "react-dom": "^19.0.0" }, "devDependencies": { "@vitejs/plugin-react": "^4.0.0", "vite": "^6.0.0" } }
X
cat > vite.config.ts <<'X'
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [react()] });
X
cat > CLAUDE.md <<'X'
# Orders

A React + Fluent UI v9 app in TypeScript, styled with Griffel. An account has
up to 20,000 orders.
X
cat > src/lib/api.ts <<'X'
import type { Order } from "../features/orders/domain";

export const fetchOrders = async (): Promise<Order[]> => (await fetch("/api/orders")).json();
export const saveOrders = async (orders: Order[]): Promise<void> => {
    await fetch("/api/orders", { method: "PUT", body: JSON.stringify(orders) });
};
X
cat > $O/domain.ts <<'X'
export type Order = { id: string; total: number };
X
cat > $O/components/OrdersPage/OrdersPage.tsx <<'X'
import { Button, Spinner } from "@fluentui/react-components";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { fetchOrders, saveOrders } from "../../../../lib/api";
import type { Order } from "../../domain";
import { OrderToolbar } from "../OrderToolbar";

export const OrdersPage = ({ currency }: { currency: string }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchOrders().then(setOrders, setError).finally(() => setIsLoading(false));
    }, []);

    const save = async () => {
        setIsSaving(true);
        await saveOrders(orders);
        setIsSaving(false);
    };
    const refresh = useCallback(() => window.location.reload(), []);
    const ReportChart = lazy(() => import("../ReportChart"));

    if (isLoading) return <Spinner />;
    if (error) return <p role="alert">{error.message}</p>;
    return (
        <main>
            <OrderToolbar currency={currency} total={orders.reduce((sum, o) => sum + o.total, 0)} />
            <Button onClick={refresh}>Refresh</Button>
            <Button disabled={isSaving} onClick={save}>Save</Button>
            <ul>
                {orders.map((order) => (
                    <li key={order.id}>{order.id}</li>
                ))}
            </ul>
            <Suspense fallback={<Spinner />}>
                <ReportChart />
            </Suspense>
        </main>
    );
};
X
cat > $O/components/OrderToolbar/OrderToolbar.tsx <<'X'
import { TotalBadge } from "../TotalBadge";

export const OrderToolbar = ({ currency, total }: { currency: string; total: number }) => (
    <header>
        <TotalBadge currency={currency} total={total} />
    </header>
);
X
cat > $O/components/OrderToolbar/index.ts <<'X'
export { OrderToolbar } from "./OrderToolbar";
X
cat > $O/components/TotalBadge/TotalBadge.tsx <<'X'
export const TotalBadge = ({ currency, total }: { currency: string; total: number }) => (
    <span>{new Intl.NumberFormat(undefined, { style: "currency", currency }).format(total)}</span>
);
X
cat > $O/components/TotalBadge/index.ts <<'X'
export { TotalBadge } from "./TotalBadge";
X
cat > $O/components/ReportChart/index.tsx <<'X'
const ReportChart = () => <figure>Report</figure>;
export default ReportChart;
X
cat > $O/contexts/OrdersContext.tsx <<'X'
import { createContext, useMemo, useState, type ReactNode } from "react";
import type { Order } from "../domain";

type OrdersContextValue = { orders: Order[]; replace: (next: Order[]) => void };
export const OrdersContext = createContext<OrdersContextValue | null>(null);

export const OrdersProvider = ({ children }: { children: ReactNode }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const value = useMemo(() => ({ orders, replace: setOrders }), [orders]);
    return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
};
X
git add -A && git commit -q -m "feat: orders"
