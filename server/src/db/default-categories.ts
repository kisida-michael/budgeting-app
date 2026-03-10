import type { NewCategory } from "./schema.js";

export const defaultCategories: NewCategory[] = [
  {
    name: "Uncategorized",
    orderIndex: 0,
    color: "rgb(241 245 249)",
    colorDark: "rgb(148 163 184)",
    colorLight: "rgb(248 250 252)"
  },
  {
    name: "Housing",
    orderIndex: 1,
    color: "rgb(226 232 240)",
    colorDark: "rgb(71 85 105)",
    colorLight: "rgb(248 250 252)"
  },
  {
    name: "Groceries",
    orderIndex: 2,
    color: "rgb(220 252 231)",
    colorDark: "rgb(22 163 74)",
    colorLight: "rgb(240 253 244)"
  },
  {
    name: "Dining",
    orderIndex: 3,
    color: "rgb(254 240 138)",
    colorDark: "rgb(202 138 4)",
    colorLight: "rgb(254 252 232)"
  },
  {
    name: "Transportation",
    orderIndex: 4,
    color: "rgb(224 231 255)",
    colorDark: "rgb(79 70 229)",
    colorLight: "rgb(238 242 255)"
  },
  {
    name: "Bills & Utilities",
    orderIndex: 5,
    color: "rgb(254 226 226)",
    colorDark: "rgb(220 38 38)",
    colorLight: "rgb(254 242 242)"
  },
  {
    name: "Shopping",
    orderIndex: 6,
    color: "rgb(245 243 255)",
    colorDark: "rgb(124 58 237)",
    colorLight: "rgb(250 245 255)"
  },
  {
    name: "Entertainment",
    orderIndex: 7,
    color: "rgb(255 237 213)",
    colorDark: "rgb(234 88 12)",
    colorLight: "rgb(255 247 237)"
  },
  {
    name: "Travel",
    orderIndex: 8,
    color: "rgb(207 250 254)",
    colorDark: "rgb(14 116 144)",
    colorLight: "rgb(236 254 255)"
  },
  {
    name: "Health",
    orderIndex: 9,
    color: "rgb(254 215 226)",
    colorDark: "rgb(190 24 93)",
    colorLight: "rgb(253 242 248)"
  },
  {
    name: "Savings",
    orderIndex: 10,
    color: "rgb(212 244 206)",
    colorDark: "rgb(102 174 89)",
    colorLight: "rgb(221 241 217)"
  },
  {
    name: "Income",
    orderIndex: 11,
    color: "rgb(209 250 229)",
    colorDark: "rgb(5 150 105)",
    colorLight: "rgb(236 253 245)"
  },
  {
    name: "Credits/Payments",
    orderIndex: 12,
    color: "rgb(224 231 255)",
    colorDark: "rgb(67 56 202)",
    colorLight: "rgb(238 242 255)"
  }
];
