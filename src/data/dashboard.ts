type StatCardData = {
  label: string;
  value: number;
  change: string;
  sign?: "auto" | "none";
};

type MiniListItem = {
  name: string;
  meta: string;
  value: string;
  tone?: "success" | "danger";
  icon?: string;
};

export const statCards: StatCardData[] = [
  { label: "净资产", value: 158420, change: "+8.6% 较上月" },
  { label: "总资产", value: 186220, change: "+6.3% 较上月" },
  { label: "总负债", value: -27800, change: "-2.1% 较上月", sign: "auto" },
  { label: "本月收入", value: 9500, change: "+15.7% 较上月" },
  { label: "本月支出", value: 3620, change: "-8.3% 较上月" },
  { label: "预算剩余", value: 1380, change: "健康度 28%" },
];

export const expiringAssets: MiniListItem[] = [
  { name: "iPhone 16 Pro", meta: "数码设备", value: "剩余 18 天", tone: "danger", icon: "手" },
  { name: "MacBook Air M2", meta: "电脑", value: "剩余 36 天", tone: "danger", icon: "电" },
  { name: "AirPods Pro 2", meta: "耳机", value: "剩余 58 天", tone: "danger", icon: "耳" },
  { name: "Sony WH-1000XM5", meta: "耳机", value: "剩余 75 天", tone: "danger", icon: "耳" },
];

export const repaymentAccounts: MiniListItem[] = [
  { name: "花呗", meta: "支付宝", value: "¥1,100.00", tone: "danger", icon: "花" },
  { name: "招商银行信用卡", meta: "尾号 1234", value: "¥2,600.00", tone: "danger", icon: "招" },
  { name: "借呗", meta: "消费信用", value: "¥4,000.00", tone: "danger", icon: "借" },
];

export const idleAssets: MiniListItem[] = [
  { name: "富士 X-T5 相机", meta: "相机", value: "闲置 90 天", tone: "success", icon: "相" },
  { name: "任天堂 Switch", meta: "游戏机", value: "闲置 120 天", tone: "success", icon: "游" },
  { name: "Bose 音箱", meta: "音箱", value: "闲置 80 天", tone: "success", icon: "音" },
];

export const dailyCostTop: MiniListItem[] = [
  { name: "MacBook Air M2", meta: "电脑", value: "¥46.32/天", icon: "电" },
  { name: "iPhone 16 Pro", meta: "手机", value: "¥12.30/天", icon: "手" },
  { name: "Sony WH-1000XM5", meta: "耳机", value: "¥6.21/天", icon: "耳" },
  { name: "AirPods Pro 2", meta: "耳机", value: "¥3.93/天", icon: "耳" },
  { name: "Kindle Paperwhite", meta: "阅读器", value: "¥1.23/天", icon: "阅" },
];

export const recentLedger: MiniListItem[] = [
  { name: "iPhone 16 Pro", meta: "资产购买", value: "-¥7,999.00", tone: "danger", icon: "资" },
  { name: "超市购物", meta: "支出", value: "-¥126.50", tone: "danger", icon: "购" },
  { name: "餐饮支出", meta: "午餐", value: "-¥35.00", tone: "danger", icon: "餐" },
  { name: "工资收入", meta: "收入", value: "+¥9,500.00", tone: "success", icon: "收" },
];
