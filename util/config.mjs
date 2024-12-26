import {Control} from '../orm.mjs';

class ConfigSetting {
    constructor() {
        this.commentEnable = true;
    }

    async getConfig(key) {
        const config = await Control.findOne({
            where: {
                key: key
            }
        });
        if (config) {
            return config.value;
        } else {
            console.error('Redis config error:', key);
        }
    }

    async setConfig(key, value) {
        const config = await Control.findOne({
            where: {
                key: key
            }
        });
        if (config) {
            await Control.update({
                value: value
            }, {where: {
                key: key
            }});
        } else {
            console.error('set config error:', key);
        }
    }

    async getConfigs() {
        const configs = await Control.findAll({
        });
        return configs;
    }
}

export default new ConfigSetting();