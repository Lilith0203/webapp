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
    pictures: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    tags: {
        type: DataTypes.STRING,
        allowNull: true
    },
    materials: {
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
        allowNull: false
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
    pictures: {
        type: DataTypes.STRING,
        allowNull: true
    },
    link: {
        type: DataTypes.TEXT,
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
        defaultValue: 999
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