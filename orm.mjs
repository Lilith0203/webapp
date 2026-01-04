import { Sequelize, DataTypes } from "sequelize";
import config from 'config'

const dbuser = config.get("mysql.user")
const dbpass = config.get("mysql.password")
const host = config.get("mysql.host")

export const sequelize = new Sequelize('webapp', dbuser, dbpass, {
    dialect: 'mysql',
    host: host,
    port: 3306,
    timezone: '+08:00'
})

//定义User
export const User = sequelize.define('User', {
    //每一列的定义
    id: {
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    //指定表名
    tableName: 'user'
});

export const Articles = sequelize.define('Articles', {
    //每一列的定义
    id: {
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    abbr: {
        type: DataTypes.STRING,
        allowNull: true
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    tags: {
        type: DataTypes.STRING,
        allowNull: true
    },
    classify: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    isDeleted: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    //指定表名
    tableName: 'articles'
});

export const MaterialType = sequelize.define('MaterialType', {
    //每一列的定义
    id: {
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    typeName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    parentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    isDeleted: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    //指定表名
    tableName: 'material_type'
});    

export const Material = sequelize.define('Material', {
    //每一列的定义
    id: {
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    substance: {
        type: DataTypes.STRING,
        allowNull: false
    },
    size: {
        type: DataTypes.STRING,
        allowNull: true
    },
    shape: {
        type: DataTypes.STRING,
        allowNull: true
    },
    color: {
        type: DataTypes.STRING,
        allowNull: true
    },
    price: {
        type: DataTypes.STRING,
        allowNull: true
    },
    stock: {
        type: DataTypes.STRING,
        allowNull: true
    },
    shop: {
        type: DataTypes.STRING,
        allowNull: true
    },
    note: {
        type: DataTypes.STRING,
        allowNull: true
    },
    link: {
        type: DataTypes.STRING,
        allowNull: true
    },
    pic: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isDeleted: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    //指定表名
    tableName: 'material'
});

export const GridData = sequelize.define('GridData', {
    //每一列的定义
    id: {
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    size: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    cells: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    isDeleted: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    //指定表名
    tableName: 'grid_data'
});

export const Works = sequelize.define('Works', {
    //每一列的定义
    id: {
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    link: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    pictures: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    video: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    tags: {
        type: DataTypes.STRING,
        allowNull: true
    },
    materials: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    isDeleted: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    //指定表名
    tableName: 'works'
});

export const Comment = sequelize.define('Comment', {
    //每一列的定义
    id: {
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    itemId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    reply: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    isApproved: {  // 新增审核字段
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0  // 0表示未审核，1表示已审核通过
    },
    isDeleted: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    //指定表名
    tableName: 'comment'
});

export const Interaction = sequelize.define('interaction', {
    //每一列的定义
    id: {
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    itemId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    like: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    weight: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    isDeleted: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    //指定表名
    tableName: 'interaction'
});

export const Control = sequelize.define('Control', {
    //每一列的定义
    id: {
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    key: {
        type: DataTypes.STRING,
        allowNull: false
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    isDeleted: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    //指定表名
    tableName: 'control'
});

export const Color = sequelize.define('Color', {
    //每一列的定义
    id: {
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    category: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    set: {
        type: DataTypes.STRING,
        allowNull: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isDeleted: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    //指定表名
    tableName: 'color'
});

export const StorySet = sequelize.define('StorySet', {
    //每一列的定义
    id: {
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    cover: {
        type: DataTypes.STRING,
        allowNull: true
    },
    sort: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    onlineAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    parentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    isDeleted: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    //指定表名
    tableName: 'story_set'
});

export const Story = sequelize.define('Story', {
    //每一列的定义
    id: {
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    detail: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    pictures: {
        type: DataTypes.STRING,
        allowNull: true
    },
    link: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    isRecommended: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    onlineAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    isDeleted: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    //指定表名
    tableName: 'story'
});

export const StoryRelation = sequelize.define('StoryRelation', {
    //每一列的定义
    id: {
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    storyId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    relatedId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    relationType: { // 关联类型
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'related' // 可选: prequel, sequel, parallel, reference, etc.
    },
    note: { // 备注
        type: DataTypes.STRING,
        allowNull: true
    },
    isDeleted: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    //指定表名
    tableName: 'story_relation'
});

export const StorySetRel = sequelize.define('StorySetRel', {
    //每一列的定义
    id: {
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    storyId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    setId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    sort: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    isDeleted: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    //指定表名
    tableName: 'story_set_rel'
});

export const Plan = sequelize.define('Plan', {
    // 列定义
    id: {
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,  // 标题
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,    // 描述
        allowNull: true
    },
    status: {
        type: DataTypes.STRING, // e.g., 'Planned', 'In Progress', 'Completed', 'On Hold'
        allowNull: true
    },
    startDate: {
        type: DataTypes.DATEONLY, // 开始日期
        allowNull: true
    },
    endDate: {
        type: DataTypes.DATEONLY, // 结束日期
        allowNull: true
    },
    link: { // <--- 新增：链接字段
        type: DataTypes.TEXT,     // 使用 TEXT 类型以容纳较长的 URL
        allowNull: true           // 允许为空
    },
    sort: {
        type: DataTypes.INTEGER, // 排序字段
        allowNull: false,
        defaultValue: 0
    },
    isDeleted: {
        type: DataTypes.INTEGER, // 软删除标记
        allowNull: false,
        defaultValue: 0
    }
}, {
    // Table options
    tableName: 'plan'
});

export const Guide = sequelize.define('Guide', {
    // 列定义
    id: {
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,  // 标题
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,    // 内容
        allowNull: true
    },
    category: {
        type: DataTypes.STRING,  // 分类
        allowNull: false
    },
    tags: {
        type: DataTypes.STRING,  // 标签（可选）
        allowNull: true
    },
    isDeleted: {
        type: DataTypes.INTEGER, // 软删除标记
        allowNull: false,
        defaultValue: 0
    }
}, {
    // Table options
    tableName: 'guide'
});