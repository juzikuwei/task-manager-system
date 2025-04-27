import os
import sys
from flask import Flask, render_template, redirect, url_for, flash, request, session, send_file
from markupsafe import Markup
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
from io import BytesIO
import pandas as pd
import logging

# 添加当前目录到路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

# 确保instance目录存在
instance_path = os.path.join(current_dir, 'instance')
os.makedirs(instance_path, exist_ok=True)

# 配置日志 - 避免重启时的重复输出
logger = logging.getLogger(__name__)
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, 
                        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# 只在主进程中显示启动日志
if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
    logger.info("启动任务管理系统...")

# 导入数据库配置
from database import db, init_db, db_initialized

# 创建Flask应用
app = Flask(__name__)

# 防止启动时的重复加载
if os.environ.get('FLASK_ENV') == 'development':
    app.config['DEBUG'] = True
    app.config['USE_RELOADER'] = False  # 禁用reloader以避免重复初始化

# 添加自定义过滤器
@app.template_filter('nl2br')
def nl2br_filter(s):
    if not s:
        return s
    return Markup(s.replace('\n', '<br>'))

app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(instance_path, "task_manager.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'static/uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB最大上传限制

# 确保上传目录存在
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# 初始化数据库 - 使用模块级标志避免重复初始化
def initialize_database():
    if not db_initialized:
        try:
            logger.info("初始化数据库...")
            init_db(app)
            logger.info("数据库初始化成功!")
            
            # 创建数据库表
            with app.app_context():
                logger.info("创建数据库表...")
                db.create_all()
                logger.info("数据库表创建成功!")
        except Exception as e:
            logger.error(f"数据库初始化错误: {str(e)}")
    else:
        logger.debug("数据库已初始化，跳过")

# 初始化数据库
initialize_database()

# 初始化登录管理器
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# 导入模型（放在数据库初始化之后避免循环导入）
from models.models import User, Task, Category, TaskHistory, Attachment

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

# 认证相关路由
@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        # 检查用户名是否已存在
        user = User.query.filter_by(username=username).first()
        if user:
            flash('用户名已存在，请选择其他用户名', 'danger')
            return redirect(url_for('register'))
        
        # 创建新用户
        new_user = User(
            username=username,
            password=generate_password_hash(password, method='pbkdf2')
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        flash('注册成功！请登录', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        remember = True if request.form.get('remember') else False
        
        user = User.query.filter_by(username=username).first()
        
        if not user or not check_password_hash(user.password, password):
            flash('请检查您的登录信息并重试', 'danger')
            return redirect(url_for('login'))
        
        login_user(user, remember=remember)
        return redirect(url_for('dashboard'))
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))