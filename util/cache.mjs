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

    async get(key) {
        // 先从内存缓存获取
        let data = this.memoryCache.get(key);
        if (data !== undefined) {
            return data;
        }

        // 如果启用了Redis，从Redis获取
        if (this.redisClient) {
            try {
                const redisData = await this.redisClient.get(key);
                if (redisData) {
                    data = JSON.parse(redisData);
                    // 同步到内存缓存
                    this.memoryCache.set(key, data);
                    return data;
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
}

export default new CacheManager();