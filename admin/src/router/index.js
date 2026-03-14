/**
 * 路由配置
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: () => import('../views/Login.vue'),
        meta: { title: '登录', requiresAuth: false }
    },
    {
        path: '/',
        component: () => import('../layouts/MainLayout.vue'),
        meta: { requiresAuth: true },
        children: [
            {
                path: '',
                redirect: '/dashboard'
            },
            {
                path: 'dashboard',
                name: 'Dashboard',
                component: () => import('../views/Dashboard.vue'),
                meta: { title: '仪表盘', icon: 'DataBoard' }
            },
            {
                path: 'users',
                name: 'Users',
                component: () => import('../views/UserManage.vue'),
                meta: { title: '用户管理', icon: 'User' }
            },
            {
                path: 'loans',
                name: 'Loans',
                component: () => import('../views/LoanManage.vue'),
                meta: { title: '贷款管理', icon: 'Money' }
            },
            {
                path: 'banners',
                name: 'Banners',
                component: () => import('../views/BannerManage.vue'),
                meta: { title: 'Banner管理', icon: 'Picture' }
            },
            {
                path: 'notifications',
                name: 'Notifications',
                component: () => import('../views/NotificationManage.vue'),
                meta: { title: '通知管理', icon: 'Bell' }
            },
            {
                path: 'sms',
                name: 'Sms',
                component: () => import('../views/SmsManage.vue'),
                meta: { title: '短信平台', icon: 'Message' }
            }
        ]
    },
    {
        path: '/:pathMatch(.*)*',
        redirect: '/dashboard'
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
    // 设置页面标题
    document.title = to.meta.title ? `${to.meta.title} - 贷款提醒后台` : '贷款提醒后台'

    const authStore = useAuthStore()

    if (to.meta.requiresAuth !== false && !authStore.isLoggedIn) {
        next({ name: 'Login', query: { redirect: to.fullPath } })
    } else if (to.name === 'Login' && authStore.isLoggedIn) {
        next({ name: 'Dashboard' })
    } else {
        next()
    }
})

// 路由错误处理
router.onError((error) => {
    const pattern = /Loading chunk (\d)+ failed/g;
    const isChunkLoadFailed = error.message.match(pattern);
    const targetPath = router.history.pending.fullPath;

    if (isChunkLoadFailed) {
        // 如果是 chunk 加载失败，尝试刷新页面
        window.location.reload();
    } else {
        console.error('路由错误:', error);
    }
});

export default router
