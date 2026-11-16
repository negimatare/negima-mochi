# Sourced by fixture.sh: a React app with two entry pages and known dead
# code. Banner is used only in commented-out JSX, formatLegacyDate only by a
# test; GuestPage is alive, wired through guest.html.
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src/components src/lib src/pages
cat > index.html <<'X'
<div id="root"></div><script type="module" src="/src/main.tsx"></script>
X
cat > guest.html <<'X'
<div id="root"></div><script type="module" src="/src/guest.tsx"></script>
X
cat > vite.config.ts <<'X'
import { defineConfig } from "vite";

export default defineConfig({
    build: { rollupOptions: { input: { main: "index.html", guest: "guest.html" } } },
});
X
cat > src/main.tsx <<'X'
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);
X
cat > src/guest.tsx <<'X'
import { createRoot } from "react-dom/client";
import { GuestPage } from "./pages/GuestPage";

createRoot(document.getElementById("root")!).render(<GuestPage />);
X
cat > src/App.tsx <<'X'
import { Header } from "./components/Header";

export const App = () => (
    <main>
        <Header />
        {/* <Banner text="Spring sale" /> */}
    </main>
);
X
cat > src/components/Header.tsx <<'X'
import { formatDate } from "../lib/format";

export const Header = () => <h1>Orders on {formatDate(new Date())}</h1>;
X
cat > src/components/Banner.tsx <<'X'
export const Banner = ({ text }: { text: string }) => <p role="status">{text}</p>;
X
cat > src/pages/GuestPage.tsx <<'X'
export const GuestPage = () => <p>Waiting for the host to start captions.</p>;
X
cat > src/lib/format.ts <<'X'
export const formatDate = (date: Date): string => date.toISOString().slice(0, 10);

export const formatLegacyDate = (date: Date): string =>
    `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
X
cat > src/lib/format.test.ts <<'X'
import { expect, it } from "vitest";
import { formatLegacyDate } from "./format";

it("formats day first", () => {
    expect(formatLegacyDate(new Date(2026, 0, 2))).toBe("2/1/2026");
});
X
