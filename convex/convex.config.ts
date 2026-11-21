import aggregate from "@convex-dev/aggregate/convex.config.js";
import { defineApp } from "convex/server";

// One aggregate per admin table: they keep running counts so admin pages can show
// "page 3 of 12" and jump to any page without reading every row.
const app = defineApp();
app.use(aggregate, { name: "loanCount" });
app.use(aggregate, { name: "toolCount" });
app.use(aggregate, { name: "userCount" });
app.use(aggregate, { name: "eventCount" });
export default app;
