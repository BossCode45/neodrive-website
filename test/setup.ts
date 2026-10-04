import { vi } from "vitest";

// `server-only` throws outside Next's react-server environment.
vi.mock("server-only", () => ({}));
