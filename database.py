from flask_sqlalchemy import SQLAlchemy
import os

# 创建SQLAlchemy实例
db = SQLAlchemy()

# 数据库初始化标志
db_initialized = False

# 初始化数据库函数
def init_db(app):
    global db_initialized
    db.init_app(app)
    db_initialized = True