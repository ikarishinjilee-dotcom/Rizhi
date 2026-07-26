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
    version: "1.0.1",
    date: "2026-07-23",
    groups: [
      {
        label: "新增",
        type: "new",
        items: [
          "管理中心新增版本管理，可维护版本号、发布日期、发布状态和更新内容。",
          "版本记录支持 Web、小程序、Android、iOS 平台，并保留历史版本。",
          "帮助页新增版本板块，按正式线版本展示新增、优化和修复内容。",
          "管理中心新增图标库管理，可维护并选择业务场景图标。",
          "资产、记账、资金账户和分类管理能力进一步完善。",
        ],
      },
      {
        label: "优化",
        type: "improved",
        items: [
          "优化资产、附加项、转让、资金账户和记账页面的表单与交互体验。",
          "优化个人分类、默认分类和系统字典的管理流程。",
          "优化管理中心权限、系统字典和图标配置的维护体验。",
          "版本列表按发布日期和版本号倒序展示，每条记录支持固定高度和详情展开。",
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
