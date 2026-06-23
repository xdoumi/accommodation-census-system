import { createRouter, createWebHashHistory } from 'vue-router'
import { setupGuards } from './guards'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/LoginView.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/DashboardView.vue'),
        meta: { title: '工作台', icon: 'Odometer' },
      },
      // 住宿单位管理
      {
        path: 'accommodation',
        name: 'AccommodationList',
        component: () => import('@/views/accommodation/AccommodationList.vue'),
        meta: { title: '住宿单位管理', permission: 'accommodation:view', icon: 'OfficeBuilding' },
      },
      {
        path: 'accommodation/create',
        name: 'AccommodationCreate',
        component: () => import('@/views/accommodation/AccommodationForm.vue'),
        meta: { title: '新增住宿单位', permission: 'accommodation:create', parent: 'AccommodationList' },
      },
      {
        path: 'accommodation/:id',
        name: 'AccommodationDetail',
        component: () => import('@/views/accommodation/AccommodationDetail.vue'),
        meta: { title: '住宿单位详情', permission: 'accommodation:view', parent: 'AccommodationList' },
      },
      {
        path: 'accommodation/:id/edit',
        name: 'AccommodationEdit',
        component: () => import('@/views/accommodation/AccommodationForm.vue'),
        meta: { title: '编辑住宿单位', permission: 'accommodation:update', parent: 'AccommodationList' },
      },
      {
        path: 'accommodation-import',
        name: 'AccommodationImport',
        component: () => import('@/views/accommodation/AccommodationImport.vue'),
        meta: { title: '批量导入', permission: 'accommodation:import', parent: 'AccommodationList' },
      },
      // 普查任务
      {
        path: 'census',
        name: 'CensusTaskList',
        component: () => import('@/views/census/CensusTaskList.vue'),
        meta: { title: '普查任务', permission: 'census:view', icon: 'List' },
      },
      {
        path: 'census/create',
        name: 'CensusTaskCreate',
        component: () => import('@/views/census/CensusTaskForm.vue'),
        meta: { title: '创建普查任务', permission: 'census:create', parent: 'CensusTaskList' },
      },
      {
        path: 'census/:id',
        name: 'CensusTaskDetail',
        component: () => import('@/views/census/CensusTaskDetail.vue'),
        meta: { title: '任务详情', permission: 'census:view', parent: 'CensusTaskList' },
      },
      {
        path: 'census/:id/edit',
        name: 'CensusTaskEdit',
        component: () => import('@/views/census/CensusTaskForm.vue'),
        meta: { title: '编辑任务', permission: 'census:update', parent: 'CensusTaskList' },
      },
      {
        path: 'census/:id/entry',
        name: 'CensusDataEntry',
        component: () => import('@/views/census/CensusDataEntry.vue'),
        meta: { title: '数据填报', permission: 'census:fill', parent: 'CensusTaskList' },
      },
      // 数据统计
      {
        path: 'statistics',
        name: 'StatisticsDashboard',
        component: () => import('@/views/statistics/StatisticsDashboard.vue'),
        meta: { title: '数据统计', permission: 'statistics:view', icon: 'DataAnalysis' },
      },
      {
        path: 'statistics/map',
        name: 'MapVisualization',
        component: () => import('@/views/statistics/MapVisualization.vue'),
        meta: { title: '地图分布', permission: 'statistics:view', parent: 'StatisticsDashboard' },
      },
      {
        path: 'statistics/report',
        name: 'ReportExport',
        component: () => import('@/views/statistics/ReportExport.vue'),
        meta: { title: '报表导出', permission: 'statistics:export', parent: 'StatisticsDashboard' },
      },
      // 系统管理
      {
        path: 'system/users',
        name: 'UserList',
        component: () => import('@/views/system/UserList.vue'),
        meta: { title: '用户管理', permission: 'system:user:view', icon: 'User' },
      },
      {
        path: 'system/users/create',
        name: 'UserCreate',
        component: () => import('@/views/system/UserForm.vue'),
        meta: { title: '新增用户', permission: 'system:user:create', parent: 'UserList' },
      },
      {
        path: 'system/users/:id/edit',
        name: 'UserEdit',
        component: () => import('@/views/system/UserForm.vue'),
        meta: { title: '编辑用户', permission: 'system:user:update', parent: 'UserList' },
      },
      {
        path: 'system/roles',
        name: 'RolePermission',
        component: () => import('@/views/system/RolePermission.vue'),
        meta: { title: '角色权限', permission: 'system:role:view', icon: 'Lock' },
      },
      {
        path: 'system/ai-settings',
        name: 'AiSettings',
        component: () => import('@/views/system/AiSettings.vue'),
        meta: { title: 'AI 设置', permission: 'system:ai:manage', icon: 'MagicStick' },
      },
    ],
  },
  // ==================== 移动端路由 ====================
  {
    path: '/m/login',
    name: 'MobileLogin',
    component: () => import('@/views/mobile/MobileLogin.vue'),
    meta: { public: true, title: '登录', mobile: true },
  },
  {
    path: '/m',
    component: () => import('@/components/mobile/MobileLayout.vue'),
    meta: { mobile: true },
    children: [
      {
        path: 'home',
        name: 'MobileHome',
        component: () => import('@/views/mobile/MobileHome.vue'),
        meta: { title: '首页', mTitle: '住宿业普查', mobile: true },
      },
      {
        path: 'tasks',
        name: 'MobileTaskList',
        component: () => import('@/views/mobile/MobileTaskList.vue'),
        meta: { title: '我的任务', permission: 'census:view', mobile: true },
      },
      {
        path: 'tasks/:id',
        name: 'MobileTaskDetail',
        component: () => import('@/views/mobile/MobileTaskDetail.vue'),
        meta: { title: '任务详情', permission: 'census:view', mobile: true },
      },
      {
        path: 'entry/:taskId/:assignmentId?',
        name: 'MobileDataEntry',
        component: () => import('@/views/mobile/MobileDataEntry.vue'),
        meta: { title: '数据填报', permission: 'census:fill', mobile: true },
      },
      {
        path: 'units',
        name: 'MobileAccommodationList',
        component: () => import('@/views/mobile/MobileAccommodationList.vue'),
        meta: { title: '住宿单位', permission: 'accommodation:view', mobile: true },
      },
      {
        path: 'units/:id',
        name: 'MobileAccommodationDetail',
        component: () => import('@/views/mobile/MobileAccommodationDetail.vue'),
        meta: { title: '单位详情', permission: 'accommodation:view', mobile: true },
      },
      {
        path: 'profile',
        name: 'MobileProfile',
        component: () => import('@/views/mobile/MobileProfile.vue'),
        meta: { title: '个人中心', mobile: true },
      },
    ],
  },
  {
    path: '/m/:pathMatch(.*)*',
    name: 'MobileNotFound',
    component: () => import('@/views/mobile/MobileNotFound.vue'),
    meta: { public: true, mobile: true },
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/errors/ForbiddenView.vue'),
    meta: { public: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/errors/NotFoundView.vue'),
    meta: { public: true },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

setupGuards(router)

export default router
