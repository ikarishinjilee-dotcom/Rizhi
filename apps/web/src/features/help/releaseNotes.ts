export type ReleaseGroupType = "new" | "improved" | "fixed";

export type ReleaseGroup = {
  label: string;
  type: ReleaseGroupType;
  items: string[];
};

export type ReleaseNote = {
  version: string;
  date: string;
  groups: ReleaseGroup[];
};

/** 内置的正式线版本记录；管理中心发布新版本时可在此基础上维护。 */
export const releaseNotes: ReleaseNote[] = [
  {
    version: "1.0.2",
    date: "2026-07-28",
    groups: [
      {
        label: "新增",
        type: "new",
        items: [
          "图标库支持小类新增、编辑、删除和排序。",
          "图标支持编辑、删除，并可同步到云端资源。",
          "新增提醒阈值设置，可配置保修、还款和闲置提醒天数。",
          "测试环境页面标题增加环境标识，便于区分测试和正式环境。",
        ],
      },
      {
        label: "优化",
        type: "improved",
        items: [
          "优化图标库云端加载、合并、迁移和失败回滚流程。",
          "优化管理中心图标库保存、同步、删除过程中的加载状态和反馈提示。",
          "优化下拉选择器，支持清空选项和更稳定的弹层展示。",
          "优化提醒设置保存体验，增加保存中状态和结果提示。",
        ],
      },
      {
        label: "修复",
        type: "fixed",
        items: [
          "修复图标库同步失败时本地数据可能被覆盖的问题。",
          "修复反馈提示层级、自动隐藏和重复消息更新问题。",
          "修复图标及提醒设置在云端数据源下无法保存的问题。",
        ],
      },
    ],
  },
  {
    version: "1.0.1",
    date: "2026-07-23",
    groups: [
      {
        label: "新增",
        type: "new",
        items: [
          "管理中心新增版本管理，支持版本号、发布日期、发布状态和更新内容。",
          "版本记录支持 Web、小程序、Android、iOS 平台，并保留历史版本。",
          "帮助页新增版本板块，按正式线版本展示新增、优化和修复内容。",
          "管理中心新增图标库管理，完善资产、记账、资金账户和分类管理能力。",
        ],
      },
      {
        label: "优化",
        type: "improved",
        items: [
          "优化资产、附加项、转让、资金账户和记账页面的表单与交互体验。",
          "优化个人分类、默认分类、系统字典和权限管理流程。",
          "版本记录按发布日期和版本号倒序展示，每条记录支持固定高度和详情展开。",
        ],
      },
      {
        label: "修复",
        type: "fixed",
        items: [
          "修复分类状态、默认分类和个人分类数据隔离相关问题。",
          "修复银行图标在账户、记账和资产场景中的统一展示问题。",
          "修复版本记录排序及内容超出时详情按钮显示不准确的问题。",
        ],
      },
    ],
  },
];
