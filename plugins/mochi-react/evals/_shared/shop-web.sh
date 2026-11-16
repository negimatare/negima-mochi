# Sourced by fixture.sh: a React + Fluent UI v9 orders app laid out as the
# mochi-react architecture skill describes (feature slices behind barrels, a
# client injected through context, i18n locale files, test builders). It has
# no node_modules and no test script, so nothing runs; graders read files.
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src/pages src/common src/test src/lib/clients src/lib/i18n/locales src/contexts/OrdersClient \
  src/features/orders/{domain,hooks} src/features/orders/components/{OrderList,OrdersToolbar} \
  src/features/customers/{domain,components/CustomerCard}
cat > package.json <<'X'
{
  "name": "shop-web",
  "private": true,
  "type": "module",
  "dependencies": {
    "@fluentui/react-components": "^9.66.0",
    "@fluentui/react-icons": "^2.0.300",
    "@hookform/resolvers": "^5.0.0",
    "i18next": "^25.0.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-hook-form": "^7.60.0",
    "react-i18next": "^15.5.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.0"
  }
}
X
cat > tsconfig.json <<'X'
{
  "compilerOptions": {
    "jsx": "react-jsx", "module": "ESNext", "moduleResolution": "bundler", "strict": true, "target": "ES2022",
    "paths": {
      "@shop/common": ["./src/common"], "@shop/contexts": ["./src/contexts"], "@shop/features/*": ["./src/features/*"],
      "@shop/lib": ["./src/lib"], "@shop/pages": ["./src/pages"], "@shop/test": ["./src/test"]
    }
  }
}
X
cat > CLAUDE.md <<'X'
# Shop web

A React 19 + Fluent UI v9 app in TypeScript, styled with Griffel, with
i18next for copy in English and Japanese. No React Compiler.
X
cat > src/main.tsx <<'X'
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);
X
cat > src/App.tsx <<'X'
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { OrdersClientProvider } from "@shop/contexts";
import { buildHttpOrdersClient } from "@shop/lib";
import { OrdersPage } from "@shop/pages";
import "@shop/lib/i18n";

const ordersClient = buildHttpOrdersClient("/api");

export const App = () => (
    <FluentProvider theme={webLightTheme}>
        <OrdersClientProvider client={ordersClient}>
            <OrdersPage />
        </OrdersClientProvider>
    </FluentProvider>
);
X
cat > src/pages/OrdersPage.tsx <<'X'
import { OrderList, OrdersToolbar } from "@shop/features/orders";

export const OrdersPage = () => (
    <main>
        <OrdersToolbar />
        <OrderList />
    </main>
);
X
echo 'export { OrdersPage } from "./OrdersPage";' > src/pages/index.ts
echo 'export {};' > src/common/index.ts
cat > src/features/orders/domain/order.ts <<'X'
export type OrderStatus = "paid" | "shipped" | "cancelled";
export type Order = { id: string; customerId: string; total: number; status: OrderStatus };
export type LoadError = "network" | "forbidden" | "notFound";
X
cat > src/lib/clients/ordersClient.ts <<'X'
import type { LoadError, Order } from "../../features/orders/domain/order";

export type OrdersClient = { listOrders: () => Promise<Order[]> };
export class OrdersLoadError extends Error {
    constructor(readonly reason: LoadError) { super(reason); }
}

export const buildHttpOrdersClient = (base: string): OrdersClient => ({
    listOrders: async () => {
        const response = await fetch(`${base}/orders`);
        if (response.status === 403) throw new OrdersLoadError("forbidden");
        if (response.status === 404) throw new OrdersLoadError("notFound");
        if (!response.ok) throw new OrdersLoadError("network");
        return response.json();
    },
});
X
cat > src/lib/index.ts <<'X'
export { buildHttpOrdersClient, OrdersLoadError } from "./clients/ordersClient";
export type { OrdersClient } from "./clients/ordersClient";
X
cat > src/lib/i18n/index.ts <<'X'
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ja from "./locales/ja.json";

void i18n.use(initReactI18next).init({ fallbackLng: "en", lng: "en", resources: { en: { translation: en }, ja: { translation: ja } } });

export default i18n;
X
cat > src/lib/i18n/locales/en.json <<'X'
{
  "orders": {
    "loading": "Loading orders",
    "loadFailed": "Orders could not be loaded.",
    "search": "Search orders"
  }
}
X
cat > src/lib/i18n/locales/ja.json <<'X'
{
  "orders": {
    "loading": "注文を読み込み中",
    "loadFailed": "注文を読み込めませんでした。",
    "search": "注文を検索"
  }
}
X
cat > src/contexts/OrdersClient/OrdersClientContext.tsx <<'X'
import { createContext, useContext, type ReactNode } from "react";
import type { OrdersClient } from "@shop/lib";

const OrdersClientContext = createContext<OrdersClient | null>(null);

export const OrdersClientProvider = ({ client, children }: { client: OrdersClient; children: ReactNode }) => (
    <OrdersClientContext.Provider value={client}>{children}</OrdersClientContext.Provider>
);

export const useOrdersClient = (): OrdersClient => {
    const client = useContext(OrdersClientContext);
    if (!client) throw new Error("useOrdersClient needs an OrdersClientProvider");
    return client;
};
X
echo 'export { OrdersClientProvider, useOrdersClient } from "./OrdersClientContext";' > src/contexts/OrdersClient/index.ts
echo 'export { OrdersClientProvider, useOrdersClient } from "./OrdersClient";' > src/contexts/index.ts
cat > src/features/orders/hooks/useOrders.ts <<'X'
import { useEffect, useState } from "react";
import { useOrdersClient } from "@shop/contexts";
import { OrdersLoadError } from "@shop/lib";
import type { LoadError, Order } from "../domain/order";

export type OrdersState =
    | { status: "loading" }
    | { status: "success"; data: Order[] }
    | { status: "error"; error: LoadError };

export const useOrders = (): OrdersState => {
    const client = useOrdersClient();
    const [state, setState] = useState<OrdersState>({ status: "loading" });
    useEffect(() => {
        client.listOrders().then(
            (data) => setState({ status: "success", data }),
            (failure: unknown) => setState({ status: "error", error: failure instanceof OrdersLoadError ? failure.reason : "network" }),
        );
    }, [client]);
    return state;
};
X
cat > src/features/orders/components/OrderList/useOrderListStyles.styles.ts <<'X'
import { makeStyles, tokens } from "@fluentui/react-components";

export const useOrderListStyles = makeStyles({
    root: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalS, margin: "0", padding: "0" },
    row: { display: "flex", justifyContent: "space-between", listStyleType: "none" },
});
X
cat > src/features/orders/components/OrderList/OrderList.tsx <<'X'
import { Spinner, Text } from "@fluentui/react-components";
import { useTranslation } from "react-i18next";
import { useOrders } from "../../hooks/useOrders";
import { useOrderListStyles } from "./useOrderListStyles.styles";

export const OrderList = () => {
    const { t } = useTranslation();
    const styles = useOrderListStyles();
    const state = useOrders();
    switch (state.status) {
        case "loading":
            return <Spinner label={t("orders.loading")} />;
        case "error":
            return <Text>{t("orders.loadFailed")}</Text>;
        case "success":
            return (
                <ul className={styles.root}>
                    {state.data.map((order) => (
                        <li className={styles.row} key={order.id}>
                            <Text>{order.id}</Text>
                            <Text>{order.total}</Text>
                        </li>
                    ))}
                </ul>
            );
    }
};
X
echo 'export { OrderList } from "./OrderList";' > src/features/orders/components/OrderList/index.ts
cat > src/features/orders/components/OrdersToolbar/OrdersToolbar.tsx <<'X'
import { Field, SearchBox } from "@fluentui/react-components";
import { useTranslation } from "react-i18next";

export const OrdersToolbar = ({ onSearch = () => {} }: { onSearch?: (query: string) => void }) => {
    const { t } = useTranslation();
    return (
        <Field label={t("orders.search")}>
            <SearchBox onChange={(_, data) => onSearch(data.value)} />
        </Field>
    );
};
X
echo 'export { OrdersToolbar } from "./OrdersToolbar";' > src/features/orders/components/OrdersToolbar/index.ts
cat > src/features/orders/index.ts <<'X'
export { OrderList } from "./components/OrderList";
export { OrdersToolbar } from "./components/OrdersToolbar";
export type { LoadError, Order, OrderStatus } from "./domain/order";
X
cat > src/features/customers/domain/customer.ts <<'X'
export type Customer = { id: string; firstName: string; lastName: string };
export const formatCustomerName = (customer: Customer): string => `${customer.firstName} ${customer.lastName}`;
X
cat > src/features/customers/components/CustomerCard/CustomerCard.tsx <<'X'
import { Card, Text } from "@fluentui/react-components";
import { formatCustomerName, type Customer } from "../../domain/customer";

export const CustomerCard = ({ customer }: { customer: Customer }) => (
    <Card>
        <Text weight="semibold">{formatCustomerName(customer)}</Text>
    </Card>
);
X
echo 'export { CustomerCard } from "./CustomerCard";' > src/features/customers/components/CustomerCard/index.ts
cat > src/features/customers/index.ts <<'X'
export { CustomerCard } from "./components/CustomerCard";
export { formatCustomerName } from "./domain/customer";
export type { Customer } from "./domain/customer";
X
cat > src/test/setup.ts <<'X'
import "@testing-library/jest-dom/vitest";
import i18n from "@shop/lib/i18n";

void i18n.changeLanguage("en");
X
cat > src/test/index.ts <<'X'
import { vi } from "vitest";
import type { OrdersClient } from "@shop/lib";
import type { Order } from "../features/orders/domain/order";

/** A fake orders client whose listOrders resolves with `orders`. */
export const buildOrdersClient = (orders: Order[] = []) => {
    const listOrders = vi.fn<OrdersClient["listOrders"]>(async () => orders);
    return { client: { listOrders } satisfies OrdersClient, listOrders };
};
X
