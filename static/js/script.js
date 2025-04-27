// 任务管理系统主脚本 - 增强版2025

// 导入GSAP核心库和插件（使用CDN方式，需要在HTML中添加相应的脚本引用）
// 在base.html中添加：
// <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>

document.addEventListener('DOMContentLoaded', function() {
    // 注册GSAP插件
    if (typeof gsap !== 'undefined') {
        if (gsap.registerPlugin && ScrollTrigger) {
            gsap.registerPlugin(ScrollTrigger);
        }
        
        // 页面加载动画
        initPageLoadAnimation();
        
        // 卡片悬停3D效果
        initCardHoverEffects();
        
        // 滚动触发动画
        initScrollAnimations();
        
        // 任务进度条动画
        animateProgressBars();
        
        // 初始化粒子背景 (仅在仪表盘页面)
        if (document.querySelector('.dashboard-container') || document.querySelector('body.auth-page')) {
            initParticlesBackground();
        }
        
        // 微交互动画
        initMicroInteractions();
    }
    
    // 深色模式切换不再需要，已经在base.html中处理
    
    // 任务筛选器
    const filterForm = document.getElementById('filterForm');
    if (filterForm) {
        const inputs = filterForm.querySelectorAll('select, input');
        inputs.forEach(input => {
            input.addEventListener('change', function() {
                filterForm.submit();
            });
        });
    }
    
    // 确认删除 - 增强版
    const deleteButtons = document.querySelectorAll('.delete-confirm');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 创建确认对话框
            const confirmDialog = document.createElement('div');
            confirmDialog.className = 'confirm-dialog';
            confirmDialog.innerHTML = `
                <div class="confirm-dialog-content">
                    <h4>确认删除</h4>
                    <p>您确定要删除吗？此操作无法撤销。</p>
                    <div class="confirm-dialog-buttons">
                        <button class="btn btn-secondary cancel-btn">取消</button>
                        <button class="btn btn-danger confirm-btn">删除</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(confirmDialog);
            
            // 动画显示
            gsap.fromTo(confirmDialog, 
                { opacity: 0, scale: 0.8 }, 
                { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.7)" }
            );
            
            // 点击取消
            confirmDialog.querySelector('.cancel-btn').addEventListener('click', function() {
                closeDialog();
            });
            
            // 点击确认
            confirmDialog.querySelector('.confirm-btn').addEventListener('click', function() {
                closeDialog(true);
            });
            
            // 点击外部关闭
            confirmDialog.addEventListener('click', function(event) {
                if (event.target === confirmDialog) {
                    closeDialog();
                }
            });
            
            function closeDialog(confirm = false) {
                gsap.to(confirmDialog, {
                    opacity: 0, 
                    scale: 0.8, 
                    duration: 0.2,
                    onComplete: function() {
                        confirmDialog.remove();
                        if (confirm) {
                            window.location.href = button.getAttribute('href');
                        }
                    }
                });
            }
        });
    });
    
    // 任务完成切换 - 带动画
    const taskCheckboxes = document.querySelectorAll('.task-complete-checkbox');
    taskCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const taskId = this.getAttribute('data-task-id');
            const taskCard = this.closest('.task-card, .list-group-item');
            
            if (taskId && taskCard) {
                if (this.checked) {
                    // 完成动画
                    gsap.to(taskCard, {
                        backgroundColor: "rgba(25, 135, 84, 0.1)",
                        borderColor: "rgba(25, 135, 84, 0.5)",
                        color: "#198754",
                        duration: 0.3,
                        onComplete: function() {
                            document.getElementById('complete-task-' + taskId).submit();
                        }
                    });
                } else {
                    document.getElementById('complete-task-' + taskId).submit();
                }
            }
        });
    });
    
    // 日期选择器初始化
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        if (!input.value) {
            // 如果没有设置日期，使用当前日期
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            input.value = `${year}-${month}-${day}`;
        }
    });
});

// 页面加载动画
function initPageLoadAnimation() {
    // 创建加载蒙层
    if (!document.getElementById('page-loader')) {
        const loader = document.createElement('div');
        loader.id = 'page-loader';
        loader.innerHTML = `
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <div class="loader-text">正在加载...</div>
            </div>
        `;
        document.body.appendChild(loader);
        
        // 页面内容淡入动画
        const tl = gsap.timeline();
        tl.to('#page-loader', {
            opacity: 0,
            pointerEvents: 'none',
            duration: 0.6,
            delay: 0.4,
            ease: 'power2.inOut'
        });
        
        // 内容入场动画
        tl.from('main > *', {
            y: 20,
            opacity: 0,
            stagger: 0.1,
            duration: 0.6,
            ease: 'power2.out'
        }, "-=0.3");
    }
}

// 卡片悬停3D效果
function initCardHoverEffects() {
    const cards = document.querySelectorAll('.card, .task-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', function(e) {
            // 获取卡片相对位置
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // 计算旋转角度 (-5°到5°)
            const rotateX = ((y - rect.height / 2) / rect.height) * -10;
            const rotateY = ((x - rect.width / 2) / rect.width) * 10;
            
            // 添加3D效果
            gsap.to(card, {
                rotateX: rotateX,
                rotateY: rotateY,
                scale: 1.02,
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                duration: 0.4,
                ease: 'power2.out',
                force3D: true,
                transformPerspective: 1000,
                transformOrigin: 'center center'
            });
            
            // 同时为卡片内部元素添加下浮效果
            const cardElements = card.querySelectorAll('.card-body > *, .card-header, .card-footer');
            gsap.to(cardElements, {
                z: 20,
                duration: 0.4,
                ease: 'power2.out'
            });
        });
        
        card.addEventListener('mouseleave', function() {
            // 恢复原状
            gsap.to(card, {
                rotateX: 0,
                rotateY: 0,
                scale: 1,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                duration: 0.6,
                ease: 'power2.out'
            });
            
            // 恢复内部元素
            const cardElements = card.querySelectorAll('.card-body > *, .card-header, .card-footer');
            gsap.to(cardElements, {
                z: 0,
                duration: 0.6,
                ease: 'power2.out'
            });
        });
    });
}

// 滚动触发动画
function initScrollAnimations() {
    // 找到所有需要动画的元素
    const animatedElements = document.querySelectorAll('.card, .task-card, h1, h2, h3, .list-group, .form-group, .btn-primary');
    
    animatedElements.forEach((el, index) => {
        // 为每个元素创建滚动触发动画
        ScrollTrigger.create({
            trigger: el,
            start: "top bottom-=100px",
            once: true,
            onEnter: () => {
                gsap.fromTo(el, 
                    { y: 30, opacity: 0 }, 
                    { 
                        y: 0, 
                        opacity: 1, 
                        duration: 0.8, 
                        delay: index * 0.05, // 错开动画时间
                        ease: "power2.out" 
                    }
                );
            }
        });
    });
}

// 进度条动画
function animateProgressBars() {
    const progressBars = document.querySelectorAll('.progress-bar');
    
    progressBars.forEach(bar => {
        const value = parseFloat(bar.getAttribute('aria-valuenow')) || 0;
        
        // 仅在视图中时触发动画
        ScrollTrigger.create({
            trigger: bar,
            start: "top bottom-=100px",
            once: true,
            onEnter: () => {
                gsap.fromTo(bar, 
                    { width: '0%' }, 
                    { 
                        width: value + '%', 
                        duration: 1.5, 
                        ease: "power3.out" 
                    }
                );
            }
        });
    });
}

// 粒子背景效果
function initParticlesBackground() {
    // 创建粒子容器
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles-container';
    document.body.appendChild(particlesContainer);
    
    // 生成随机粒子
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // 随机颜色（主题色偏淡）
        const colors = ['rgba(16, 163, 127, 0.2)', 'rgba(84, 54, 218, 0.15)', 'rgba(59, 130, 246, 0.2)'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // 随机大小
        const size = Math.random() * 15 + 5;
        
        // 设置粒子样式
        particle.style.cssText = `
            position: fixed;
            width: ${size}px;
            height: ${size}px;
            background-color: ${color};
            border-radius: 50%;
            left: ${Math.random() * 100}vw;
            top: ${Math.random() * 100}vh;
            pointer-events: none;
            z-index: -1;
            opacity: ${Math.random() * 0.7 + 0.3};
        `;
        
        particlesContainer.appendChild(particle);
        animateParticle(particle);
    }
    
    function animateParticle(particle) {
        // 创建随机动画
        const duration = Math.random() * 60 + 30; // 30-90秒
        const xMove = Math.random() * 40 - 20; // -20到20px
        const yMove = Math.random() * 40 - 20; // -20到20px
        
        gsap.to(particle, {
            x: xMove, 
            y: yMove,
            duration: duration,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
        
        // 添加缩放动画
        gsap.to(particle, {
            scale: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.5 + 0.3,
            duration: Math.random() * 10 + 5,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    }
}

// 微交互动画
function initMicroInteractions() {
    // 按钮悬停效果
    const buttons = document.querySelectorAll('.btn-primary, .btn-success, .btn-danger');
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            gsap.to(this, {
                scale: 1.05,
                duration: 0.3,
                ease: "back.out(1.5)"
            });
        });
        
        btn.addEventListener('mouseleave', function() {
            gsap.to(this, {
                scale: 1,
                duration: 0.3,
                ease: "power2.out"
            });
        });
        
        btn.addEventListener('mousedown', function() {
            gsap.to(this, {
                scale: 0.95,
                duration: 0.1
            });
        });
        
        btn.addEventListener('mouseup', function() {
            gsap.to(this, {
                scale: 1.05,
                duration: 0.2,
                ease: "back.out(1.5)"
            });
        });
    });
    
    // 输入框聚焦效果
    const inputs = document.querySelectorAll('.form-control');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            gsap.to(this, {
                boxShadow: "0 0 0 3px rgba(16, 163, 127, 0.3)",
                duration: 0.3
            });
        });
        
        input.addEventListener('blur', function() {
            gsap.to(this, {
                boxShadow: "none",
                duration: 0.3
            });
        });
    });
}