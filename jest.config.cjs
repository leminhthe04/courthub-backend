/** @type {import("jest").Config} */
module.exports = {
  rootDir: ".",
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.spec.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }],
  },
  moduleFileExtensions: ["js", "json", "ts"],
};
