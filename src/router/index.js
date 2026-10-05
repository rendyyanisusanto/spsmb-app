import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import PublicLayout from '@/layouts/PublicLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import ManagementLayout from '@/layouts/ManagementLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: PublicLayout,
      children: [
        {
          path: '',
          name: 'public-guide',
          component: () => import('@/views/public/GuideView.vue')
        },
        {
          path: 'pendaftaran',
          name: 'public-registration',
          component: () => import('@/views/public/RegistrationStartView.vue')
        },
        {
          path: 'pendaftaran/sukses',
          name: 'public-registration-success',
          component: () => import('@/views/public/RegistrationSuccessView.vue')
        },
        {
          path: 'pendaftaran/lengkap',
          name: 'public-registration-full',
          component: () => import('@/views/public/FullRegistrationView.vue')
        },
        {
          path: 'pendaftaran/lanjut/:hash',
          name: 'public-registration-resume',
          component: () => import('@/views/public/RegistrationResumeView.vue')
        },
        {
          path: 'pendaftaran/selesai',
          name: 'public-registration-final-success',
          component: () => import('@/views/public/SuccessFinalView.vue')
        },
        {
          path: 'pendaftaran/formulir',
          name: 'public-registration-form',
          component: () => import('@/views/public/RegistrationFormPlaceholderView.vue')
        },
        {
          path: 'demo',
          name: 'public-demo',
          component: () => import('@/views/public/PlaceholderView.vue')
        },
        {
          path: ':pathMatch(.*)*',
          name: 'public-not-found',
          component: () => import('@/views/public/NotFoundView.vue')
        }
      ]
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('@/views/admin/DashboardView.vue'),
          meta: { roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'] }
        },
        {
          path: 'pendaftar',
          name: 'admin-applicants',
          component: () => import('@/views/admin/ApplicantsView.vue'),
          meta: { roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'] }
        },
        {
          path: 'pendaftar/:id',
          name: 'admin-applicant-detail',
          component: () => import('@/views/admin/ApplicantDetailView.vue'),
          meta: { roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'] }
        },
        {
          path: 'lembaga',
          name: 'admin-institution',
          component: () => import('@/views/admin/InstitutionView.vue'),
          meta: { roles: ['SUPER_ADMIN'] }
        },
        {
          path: 'periode',
          name: 'admin-period',
          component: () => import('@/views/admin/PeriodView.vue'),
          meta: { roles: ['SUPER_ADMIN'] }
        },
        {
          path: 'program',
          name: 'admin-program',
          component: () => import('@/views/admin/ProgramView.vue'),
          meta: { roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'] }
        },
        {
          path: 'form',
          name: 'admin-form',
          component: () => import('@/views/admin/FormManagementView.vue'),
          meta: { roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'] }
        },
        {
          path: 'persyaratan',
          name: 'admin-requirement',
          component: () => import('@/views/admin/RequirementsManagementView.vue'),
          meta: { roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'] }
        },
        {
          path: 'persyaratan/pendaftar/:id',
          name: 'admin-requirement-applicant-detail',
          component: () => import('@/views/admin/RequirementsApplicantDetailView.vue'),
          meta: { roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'] }
        },
        {
          path: 'whatsapp/template',
          name: 'admin-wa-template',
          component: () => import('@/views/admin/WhatsappTemplateManagementView.vue'),
          meta: { roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'] }
        },
        {
          path: 'whatsapp/log',
          name: 'admin-wa-log',
          component: () => import('@/views/admin/WhatsappLogView.vue'),
          meta: { roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'] }
        },
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('@/views/admin/UserManagementView.vue'),
          meta: { roles: ['SUPER_ADMIN'] }
        },
        {
          path: 'audit-log',
          name: 'admin-audit',
          component: () => import('@/views/admin/AuditLogView.vue'),
          meta: { roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'] }
        },
        {
          path: 'settings',
          name: 'admin-settings',
          component: () => import('@/views/admin/SettingsView.vue'),
          meta: { roles: ['SUPER_ADMIN'] }
        },
        {
          path: 'laporan',
          name: 'admin-report',
          component: () => import('@/views/admin/ReportView.vue'),
          meta: { roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'] }
        },
        {
          path: '403',
          name: 'admin-access-denied',
          component: () => import('@/views/admin/AccessDeniedView.vue')
        },
        {
          path: ':pathMatch(.*)*',
          name: 'admin-not-found',
          component: () => import('@/views/admin/NotFoundView.vue')
        }
      ]
    }
  ],
  scrollBehavior() {
    return { top: 0, behavior: 'smooth' }
  }
})

router.beforeEach((to, from, next) => {
  const { isAuthenticated, hasRole } = useAuth()
  
  const isAuth = isAuthenticated.value

  if (to.meta.requiresAuth && !isAuth) {
    next('/login')
  } else if (to.meta.guestOnly && isAuth) {
    next('/admin')
  } else if (to.meta.roles && !hasRole(to.meta.roles)) {
    // If user is authenticated but doesn't have the correct role for this route, redirect them to a safe route
    next('/admin/403')
  } else {
    next()
  }
})

export default router
