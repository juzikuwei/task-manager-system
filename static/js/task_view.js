/**
 * 任务详情页面的JavaScript功能
 * 负责子任务状态更新、进度计算和错误处理
 */

// 在DOM加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // CSRF 令牌获取 - 从页面元数据获取
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    
    // 初始化子任务相关功能
    initSubtaskHandlers();
    
    /**
     * 初始化子任务处理程序
     */
    function initSubtaskHandlers() {
        const subtaskChecks = document.querySelectorAll('.subtask-check');
        
        subtaskChecks.forEach(check => {
            check.addEventListener('change', function() {
                handleSubtaskToggle(this);
            });
        });
    }
    
    /**
     * 处理子任务状态切换
     * @param {HTMLElement} checkbox - 子任务复选框元素
     */
    function handleSubtaskToggle(checkbox) {
        const subtaskId = checkbox.dataset.subtaskId;
        const completed = checkbox.checked;
        const subtaskContainer = checkbox.closest('.subtask-item');
        
        // 禁用复选框防止重复点击
        checkbox.disabled = true;
        
        // 显示加载指示器
        const loader = showLoadingState(subtaskContainer);
        
        // 发送请求更新子任务状态
        updateSubtaskOnServer(subtaskId, completed)
            .then(data => {
                if (data.success) {
                    updateSubtaskUI(checkbox, subtaskContainer, completed);
                    updateProgress();
                } else {
                    throw new Error(data.message || '操作失败，请重试');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                checkbox.checked = !completed; // 恢复原状态
                showErrorNotification('更新子任务状态失败: ' + error.message);
            })
            .finally(() => {
                // 移除加载指示器并重新启用复选框
                removeLoadingState(subtaskContainer, loader);
                checkbox.disabled = false;
            });
    }
    
    /**
     * 在服务器上更新子任务状态
     * @param {String} subtaskId - 子任务ID
     * @param {Boolean} completed - 完成状态
     * @returns {Promise} - 返回Promise对象
     */
    async function updateSubtaskOnServer(subtaskId, completed) {
        const response = await fetch(`/subtasks/${subtaskId}/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({ completed: completed }),
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`服务器返回状态码: ${response.status}`);
        }
        
        return await response.json();
    }
    
    /**
     * 显示加载状态
     * @param {HTMLElement} element - 要添加加载状态的元素
     * @returns {HTMLElement} - 加载器元素
     */
    function showLoadingState(element) {
        element.classList.add('position-relative');
        const loader = document.createElement('div');
        loader.className = 'subtask-loader';
        loader.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"><span class="visually-hidden">正在加载...</span></div>';
        element.appendChild(loader);
        return loader;
    }
    
    /**
     * 移除加载状态
     * @param {HTMLElement} element - 元素
     * @param {HTMLElement} loader - 加载器元素
     */
    function removeLoadingState(element, loader) {
        element.classList.remove('position-relative');
        if (loader) loader.remove();
    }
    
    /**
     * 更新子任务UI
     * @param {HTMLElement} checkbox - 复选框元素
     * @param {HTMLElement} subtaskContainer - 子任务容器
     * @param {Boolean} completed - 完成状态
     */
    function updateSubtaskUI(checkbox, subtaskContainer, completed) {
        const subtaskText = subtaskContainer.querySelector('.subtask-text');
        
        if (completed) {
            subtaskContainer.classList.add('bg-light');
            subtaskText.classList.add('text-muted', 'text-decoration-line-through');
            
            // 添加完成时间
            const existingTime = subtaskText.parentNode.querySelector('small');
            if (existingTime) existingTime.remove(); // 移除现有的，避免重复
            
            let completedAt = document.createElement('small');
            completedAt.className = 'text-muted';
            completedAt.textContent = `已完成于 ${new Date().toLocaleString()}`;
            subtaskText.parentNode.appendChild(completedAt);
        } else {
            subtaskContainer.classList.remove('bg-light');
            subtaskText.classList.remove('text-muted', 'text-decoration-line-through');
            
            // 移除完成时间
            const completedTime = subtaskText.parentNode.querySelector('small');
            if (completedTime) {
                completedTime.remove();
            }
        }
    }
    
    /**
     * 更新进度条和相关UI
     */
    function updateProgress() {
        const totalSubtasks = document.querySelectorAll('.subtask-item').length;
        const completedSubtasks = document.querySelectorAll('.subtask-check:checked').length;
        
        if (totalSubtasks > 0) {
            const progressPercent = Math.round((completedSubtasks / totalSubtasks) * 100);
            const progressBar = document.querySelector('.progress-bar');
            const progressText = document.querySelector('.progress + div small');
            
            if (!progressBar || !progressText) return;
            
            progressBar.style.width = `${progressPercent}%`;
            progressBar.setAttribute('aria-valuenow', progressPercent);
            progressText.textContent = `完成进度: ${progressPercent}%`;
            
            // 更新进度条颜色
            progressBar.className = 'progress-bar';
            if (progressPercent === 100) {
                progressBar.classList.add('bg-success');
            } else if (progressPercent > 50) {
                progressBar.classList.add('bg-info');
            } else if (progressPercent > 0) {
                progressBar.classList.add('bg-warning');
            } else {
                progressBar.classList.add('bg-secondary');
            }
            
            // 如果进度达到100%，询问用户是否要标记整个任务为完成
            updateCompletionSuggestion(progressPercent);
        }
    }
    
    /**
     * 根据进度更新完成建议UI
     * @param {Number} progressPercent - 完成百分比
     */
    function updateCompletionSuggestion(progressPercent) {
        const taskId = getTaskIdFromUrl();
        if (!taskId) return;
        
        if (progressPercent === 100 && !document.querySelector('.task-complete-suggestion')) {
            const completeSuggestion = document.createElement('div');
            completeSuggestion.className = 'alert alert-success mt-3 task-complete-suggestion';
            completeSuggestion.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div><i class="fas fa-check-circle me-2"></i> 所有子任务已完成！是否标记整个任务为已完成？</div>
                    <a href="/task/${taskId}/complete" class="btn btn-sm btn-success">标记完成</a>
                </div>
            `;
            document.querySelector('.card-body').appendChild(completeSuggestion);
        } else if (progressPercent < 100) {
            const suggestion = document.querySelector('.task-complete-suggestion');
            if (suggestion) suggestion.remove();
        }
    }
    
    /**
     * 从URL中获取任务ID
     * @returns {String|null} - 任务ID或null
     */
    function getTaskIdFromUrl() {
        const pathParts = window.location.pathname.split('/');
        const taskIdIndex = pathParts.indexOf('task') + 1;
        
        if (taskIdIndex > 0 && taskIdIndex < pathParts.length) {
            return pathParts[taskIdIndex];
        }
        
        return null;
    }
    
    /**
     * 显示错误通知
     * @param {String} message - 错误消息
     */
    function showErrorNotification(message) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = 'alert alert-danger alert-dismissible fade show position-fixed';
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 350px;';
        notification.innerHTML = `
            <div class="d-flex">
                <div class="me-2"><i class="fas fa-exclamation-circle"></i></div>
                <div>${message}</div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 3秒后自动关闭
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
});