import { STORAGE_KEYS } from '@/constants/storageKeys'

const initialUsers = [
  {
    id: 1,
    name: 'Super Admin',
    username: 'superadmin',
    email: 'superadmin@spsmb.com',
    role: 'SUPER_ADMIN',
    institution: null,
    status: 'ACTIVE',
    password: 'admin', // mock password
    lastLogin: '1 Oktober 2026, 07:30'
  },
  {
    id: 2,
    name: 'Admin SMK',
    username: 'adminsmk',
    email: 'admin.smk@spsmb.com',
    role: 'ADMIN_SPSMB',
    institution: {
      id: 3,
      name: 'SMK IT Asy-Syadzili'
    },
    status: 'ACTIVE',
    password: 'admin',
    lastLogin: '1 Oktober 2026, 08:00'
  }
]

export const getUsersMock = async () => {
  await new Promise(resolve => setTimeout(resolve, 400))
  const saved = localStorage.getItem('spsmb_users')
  if (saved) return { success: true, data: JSON.parse(saved) }
  
  localStorage.setItem('spsmb_users', JSON.stringify(initialUsers))
  return { success: true, data: initialUsers }
}

export const saveUsersMock = async (users) => {
  await new Promise(resolve => setTimeout(resolve, 500))
  localStorage.setItem('spsmb_users', JSON.stringify(users))
  return { success: true }
}

