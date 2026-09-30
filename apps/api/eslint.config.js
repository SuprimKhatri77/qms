import { config } from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    rules: {
      // `const { cookies: _, ...body } = result` is how a controller drops a
      // field before sending the rest; the dropped one is unused on purpose.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Generated SQL migrations and build output.
    ignores: ["dist/**", "drizzle/**"],
  },
];
