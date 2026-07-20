import type { CategoryRecord } from "@/domain/models";

/** 默认记账一级分类；不包含任何二级分类，二级分类由用户自行维护。 */
export const defaultTransactionCategoryTemplates: CategoryRecord[] = [
  ["tx-meals", "expense", "三餐", 110], ["tx-snacks", "expense", "零食", 120], ["tx-clothing", "expense", "衣服", 130],
  ["tx-transport-default", "expense", "交通", 140], ["tx-travel", "expense", "旅行", 150], ["tx-children", "expense", "孩子", 160],
  ["tx-pets", "expense", "宠物", 170], ["tx-phone-network", "expense", "话费网费", 180], ["tx-tobacco-alcohol", "expense", "烟酒", 190],
  ["tx-study", "expense", "学习", 200], ["tx-daily-default", "expense", "日用品", 210], ["tx-housing", "expense", "住房", 220],
  ["tx-beauty", "expense", "美妆", 230], ["tx-medical", "expense", "医疗", 240], ["tx-red-envelope", "expense", "发红包", 250],
  ["tx-auto-fuel", "expense", "汽车/加油", 260], ["tx-entertainment", "expense", "娱乐", 270], ["tx-gifts", "expense", "请客送礼", 280],
  ["tx-electronics", "expense", "电器数码", 290], ["tx-sports-default", "expense", "运动", 300], ["tx-other-expense", "expense", "其它", 390],
  ["tx-salary-default", "income", "工资", 510], ["tx-living-expense", "income", "生活费", 520], ["tx-income-red-envelope", "income", "收红包", 530],
  ["tx-windfall", "income", "外快", 540], ["tx-stocks-funds", "income", "股票基金", 550], ["tx-other-income", "income", "其它", 590],
].map(([id, type, name, sort]) => ({
  id, domain: "transaction", type, name, sort,
  enabled: true, isSystem: true,
} as CategoryRecord));
