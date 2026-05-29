import NodeCache from 'node-cache';
import Redis from 'ioredis';
import config from 'config';

class CacheManager {
    constructor() {
        // 内存缓存，默认缓存时间30分钟
        this.memoryCache = new NodeCache({ 
            stdTTL: 1800,
            checkperiod: 120
        });

        // 可选：Redis缓存
        try {
            if (config.get('redis.enabled')) {
                this.redisClient = new Redis({
                    host: config.get('redis.host'),
                    port: config.get('redis.port'),
                    password: config.get('redis.password'),
                    db: config.get('redis.db')
                });
            }
        } catch (error) {
            console.warn('Redis configuration not found, using memory cache only');
        }
    }

    parseStoredJson(raw) {
        let data = JSON.parse(raw);
        // 兼容 Redis 中被二次 stringify 的值
        if (typeof data === 'string') {
            const trimmed = data.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                try {
                    data = JSON.parse(trimmed);
                } catch (_) {
                    /* keep string */
                }
            }
        }
        return data;
    }

    normalizeStoredObject(data) {
        if (typeof data === 'string') {
            const trimmed = data.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                try {
                    return this.normalizeStoredObject(JSON.parse(trimmed));
                } catch (_) {
                    return null;
                }
            }
            return null;
        }
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return null;
        }
        return data;
    }

    /** 持久化读取：以 Redis 为准，避免内存缓存与 Redis 不一致 */
    async getPersist(key) {
        if (this.redisClient) {
            try {
                const redisData = await this.redisClient.get(key);
                if (redisData) {
                    const data = this.normalizeStoredObject(this.parseStoredJson(redisData));
                    if (data) {
                        this.memoryCache.set(key, data, 0);
                        return data;
                    }
                }
                // Redis 无此键时清掉可能过期的内存副本
                this.memoryCache.del(key);
                return null;
            } catch (error) {
                console.error('Redis getPersist error:', error);
            }
        }

        const data = this.memoryCache.get(key);
        if (data !== undefined) {
            return this.normalizeStoredObject(data);
        }
        return null;
    }

    async get(key) {
        // 先从内存缓存获取
        let data = this.memoryCache.get(key);
        if (data !== undefined) {
            return this.normalizeStoredObject(data);
        }

        // 如果启用了Redis，从Redis获取
        if (this.redisClient) {
            try {
                const redisData = await this.redisClient.get(key);
                if (redisData) {
                    data = this.normalizeStoredObject(this.parseStoredJson(redisData));
                    if (data) {
                        // 同步到内存缓存
                        this.memoryCache.set(key, data, 0);
                        return data;
                    }
                }
            } catch (error) {
                console.error('Redis get error:', error);
            }
        }

        return null;
    }

    async set(key, data, ttl = 1800) {
        // 设置内存缓存
        this.memoryCache.set(key, data, ttl);

        // 如果启用了Redis，同步到Redis
        if (this.redisClient) {
            try {
                await this.redisClient.setex(key, ttl, JSON.stringify(data));
            } catch (error) {
                console.error('Redis set error:', error);
            }
        }
    }

    async del(key) {
        // 删除内存缓存
        this.memoryCache.del(key);

        // 如果启用了Redis，同步删除Redis缓存
        if (this.redisClient) {
            try {
                await this.redisClient.del(key);
            } catch (error) {
                console.error('Redis del error:', error);
            }
        }
    }

    /** 持久化存储（无过期），用于用户偏好等 */
    async setPersist(key, data) {
        this.memoryCache.set(key, data, 0);

        if (this.redisClient) {
            try {
                await this.redisClient.set(key, JSON.stringify(data));
            } catch (error) {
                console.error('Redis setPersist error:', error);
            }
        }
    }
}

export default new CacheManager();