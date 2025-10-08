'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization/models.html#lifecycle-hooks)
 * to customize this model
 */

module.exports = {
  lifecycles: {
    beforeCreate: async (data) => {
      // 如果沒有設定display_order，根據fatal_count自動設定
      if (!data.display_order && data.fatal_count) {
        // 這裡可以加入自動排序邏輯
      }
    },
    beforeUpdate: async (params, data) => {
      // 更新時的邏輯
      if (data.last_updated_by === undefined) {
        data.last_updated_by = 'system';
      }
    }
  }
};
