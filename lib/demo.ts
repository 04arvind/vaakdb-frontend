import type { QueryResult, SchemaTable } from "@/lib/types";

/** Mock schema and answers used by lib/vaakdb-api.ts until the backend is connected. */

export const DEMO_SCHEMA: SchemaTable[] = [
  {
    name: "customers",
    columns: [
      { name: "id", type: "integer", primaryKey: true },
      { name: "name", type: "text" },
      { name: "email", type: "text" },
      { name: "city", type: "text" },
      { name: "created_at", type: "timestamp" },
    ],
  },
  {
    name: "products",
    columns: [
      { name: "id", type: "integer", primaryKey: true },
      { name: "name", type: "text" },
      { name: "category", type: "text" },
      { name: "price", type: "numeric" },
    ],
  },
  {
    name: "orders",
    columns: [
      { name: "id", type: "integer", primaryKey: true },
      { name: "customer_id", type: "integer" },
      { name: "status", type: "text" },
      { name: "total", type: "numeric" },
      { name: "ordered_at", type: "timestamp" },
    ],
  },
  {
    name: "order_items",
    columns: [
      { name: "order_id", type: "integer", primaryKey: true },
      { name: "product_id", type: "integer", primaryKey: true },
      { name: "quantity", type: "integer" },
      { name: "unit_price", type: "numeric" },
    ],
  },
];

const WRITE_PATTERN = /\b(delete|drop|update|insert|truncate|alter)\b/i;

export function demoAnswer(question: string): QueryResult {
  const q = question.toLowerCase();

  if (WRITE_PATTERN.test(q)) {
    throw new Error(
      "Guardrails blocked this request: VaakDB only runs read-only queries.",
    );
  }

  if (q.includes("city") || q.includes("customer")) {
    return {
      answer:
        "Bengaluru has the most customers (412), followed by Mumbai and Delhi. Together the top 3 cities make up about 58% of the customer base.",
      sql: `SELECT city, COUNT(*) AS customers
FROM customers
GROUP BY city
ORDER BY customers DESC
LIMIT 5;`,
      columns: ["city", "customers"],
      rows: [
        ["Bengaluru", 412],
        ["Mumbai", 377],
        ["Delhi", 301],
        ["Pune", 188],
        ["Hyderabad", 164],
      ],
      sources: ["customers"],
    };
  }

  if (q.includes("month") || q.includes("revenue") || q.includes("sales")) {
    return {
      answer:
        "Revenue grew steadily over the last 6 months, peaking in September at ₹18.4L — a 22% increase over April.",
      sql: `SELECT date_trunc('month', ordered_at) AS month,
       SUM(total) AS revenue
FROM orders
WHERE status = 'completed'
  AND ordered_at >= now() - interval '6 months'
GROUP BY 1
ORDER BY 1;`,
      columns: ["month", "revenue"],
      rows: [
        ["2026-04", 1508200],
        ["2026-05", 1561900],
        ["2026-06", 1622450],
        ["2026-07", 1710300],
        ["2026-08", 1795120],
        ["2026-09", 1840010],
      ],
      sources: ["orders"],
    };
  }

  if (q.includes("status") || q.includes("pending") || q.includes("cancel")) {
    return {
      answer:
        "Most orders are completed (81%). 6% are still pending and 4% were cancelled.",
      sql: `SELECT status, COUNT(*) AS orders,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM orders
GROUP BY status
ORDER BY orders DESC;`,
      columns: ["status", "orders", "pct"],
      rows: [
        ["completed", 8112, 81.1],
        ["shipped", 902, 9.0],
        ["pending", 598, 6.0],
        ["cancelled", 391, 3.9],
      ],
      sources: ["orders"],
    };
  }

  return {
    answer:
      "The best-selling product is the Wireless Earbuds Pro with 1,240 units sold. Electronics dominate the top 5.",
    sql: `SELECT p.name, p.category, SUM(oi.quantity) AS units_sold
FROM order_items oi
JOIN products p ON p.id = oi.product_id
GROUP BY p.name, p.category
ORDER BY units_sold DESC
LIMIT 5;`,
    columns: ["name", "category", "units_sold"],
    rows: [
      ["Wireless Earbuds Pro", "Electronics", 1240],
      ["Smart Watch S2", "Electronics", 987],
      ["Cotton Kurta", "Apparel", 860],
      ["USB-C Charger 65W", "Electronics", 812],
      ["Steel Water Bottle", "Home", 744],
    ],
    sources: ["order_items", "products"],
  };
}
