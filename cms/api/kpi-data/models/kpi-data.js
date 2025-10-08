'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization/models.html#lifecycle-hooks)
 * to customize this model
 */

module.exports = {
  lifecycles: {
    beforeCreate: async (data) => {
      // 自動計算百分比變化
      if (data.current_value && data.baseline_value) {
        if (data.baseline_value !== 0) {
          data.pct_change = (data.current_value - data.baseline_value) / data.baseline_value;
        } else {
          data.pct_change = 0;
        }
      }
    },
    beforeUpdate: async (params, data) => {
      // 自動計算百分比變化
      if (data.current_value && data.baseline_value) {
        if (data.baseline_value !== 0) {
          data.pct_change = (data.current_value - data.baseline_value) / data.baseline_value;
        } else {
          data.pct_change = 0;
        }
      }
    }
  }
};
