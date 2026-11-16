#!/usr/bin/env bash
# CustomerCard already has a snapshot test that queries by test id, a neighbour to copy.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-web.sh"
cat > src/features/customers/components/CustomerCard/CustomerCard.test.tsx <<'X'
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { CustomerCard } from "./CustomerCard";

it("renders", () => {
    const { container } = render(<CustomerCard customer={{ id: "c-1", firstName: "Ada", lastName: "Lovelace" }} />);
    expect(container).toMatchSnapshot();
    expect(screen.getByTestId("customer-name")).toBeTruthy();
});
X
git add -A && git commit -q -m "feat: shop web"
