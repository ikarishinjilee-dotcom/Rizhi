import {
  Baby, BadgeDollarSign, Banknote, Bike, BookOpen, BriefcaseBusiness, Bus, CakeSlice,
  Car, Cat, Coffee, CreditCard, Dumbbell, Film, Fuel, Gamepad2, Gift, GraduationCap,
  Hammer, HeartPulse, Home, Hotel, Laptop, Medal, Music, Package, PawPrint, Phone,
  Pill, Plane, ReceiptText, Scissors, Shirt, ShoppingBag, ShoppingCart, Sparkles,
  Tags, Train, TrendingUp, Utensils, WalletCards, Wrench,
} from "@lucide/vue";

export const transactionCategoryIcons = [
  ["餐饮", "utensils", Utensils], ["咖啡", "coffee", Coffee], ["购物", "shopping-bag", ShoppingBag],
  ["超市", "shopping-cart", ShoppingCart], ["汽车", "car", Car], ["公交", "bus", Bus],
  ["火车", "train", Train], ["飞机", "plane", Plane], ["骑行", "bike", Bike],
  ["加油", "fuel", Fuel], ["居家", "home", Home], ["住宿", "hotel", Hotel],
  ["服装", "shirt", Shirt], ["数码", "laptop", Laptop], ["手机", "phone", Phone],
  ["医疗", "health", HeartPulse], ["药品", "pill", Pill], ["健身", "fitness", Dumbbell],
  ["娱乐", "game", Gamepad2], ["电影", "film", Film], ["音乐", "music", Music],
  ["教育", "education", GraduationCap], ["阅读", "book", BookOpen], ["工作", "work", BriefcaseBusiness],
  ["工资", "salary", Banknote], ["奖金", "bonus", BadgeDollarSign], ["投资", "investment", TrendingUp],
  ["钱包", "wallet", WalletCards], ["信用卡", "credit-card", CreditCard], ["账单", "receipt", ReceiptText],
  ["礼物", "gift", Gift], ["生日", "birthday", CakeSlice], ["育儿", "baby", Baby],
  ["宠物", "pet", PawPrint], ["猫咪", "cat", Cat], ["维修", "repair", Wrench],
  ["工具", "tools", Hammer], ["美容", "beauty", Sparkles], ["理发", "haircut", Scissors],
  ["包裹", "package", Package], ["荣誉", "medal", Medal], ["其他", "other", Tags],
].map(([label, value, component]) => ({ label: label as string, value: value as string, component }));

const iconMap = Object.fromEntries(transactionCategoryIcons.map((item) => [item.value, item.component]));

export function transactionCategoryIcon(icon?: string) {
  return iconMap[icon || ""] || Tags;
}
