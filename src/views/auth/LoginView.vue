<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const credential = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)

const router = useRouter()
const { login, isAuthenticated } = useAuth()

onMounted(() => {
  if (isAuthenticated.value) {
    router.push('/admin')
  }
})

const handleSubmit = async () => {
  error.value = ''
  loading.value = true
  
  const res = await login(credential.value, password.value)
  if (res.success) {
    router.push('/admin')
  } else {
    error.value = res.message || 'Login gagal.'
  }
  
  loading.value = false
}
</script>

<template>
  <div class="login-container">
    
    <!-- Animated background elements -->
    <div class="bg-bubbles"></div>

    <div class="login-wrapper">
      
      <!-- Header -->
      <div class="login-header fadeIn">
        <div class="logo-container">
          <img src="/1.png" alt="Logo Asy-Syadzili" class="logo" />
        </div>
        <h1 class="mainTitle">Admin Login</h1>
        <p class="subtitle">SPMB Santri Pasir Asy-Syadzili</p>
      </div>

      <!-- Login Card -->
      <div class="login-card fadeIn">
        
        <!-- Error Alert -->
        <div v-if="error" class="error-alert">
          ⚠️ {{ error }}
        </div>

        <!-- Login Form -->
        <form @submit.prevent="handleSubmit">
          <div class="input-group">
            <label class="login-label">Username atau Email</label>
            <input
              type="text"
              v-model="credential"
              placeholder="Masukkan username atau email"
              required
              :disabled="loading"
              class="login-input"
            />
          </div>

          <div class="input-group">
            <label class="login-label">Password</label>
            <div class="password-wrapper">
              <input
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                placeholder="Masukkan password"
                required
                :disabled="loading"
                class="login-input"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                :disabled="loading"
                class="toggle-password"
              >
                <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-off"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="login-button"
            :class="{ 'loading': loading }"
          >
            <span v-if="loading" class="loadingSpinner"></span>
            {{ loading ? 'Sedang Login...' : 'Login' }}
          </button>
        </form>
      </div>

      <!-- Back to Home -->
      <div class="back-link-container">
        <router-link to="/" class="back-link">
          &larr; Kembali ke Halaman Utama
        </router-link>
      </div>

      <!-- Footer -->
      <div class="footer">
        <small>&copy; 2024 SPMB Santri Pasir Asy-Syadzili. All rights reserved.</small>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

.login-container {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #1A4D2E 0%, #2d6741 30%, #1A4D2E 70%, #0f3a1f 100%);
  font-family: 'Poppins', sans-serif;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.bg-bubbles {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: 
    radial-gradient(circle at 20% 80%, rgba(245, 241, 227, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(245, 241, 227, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
  animation: float 20s ease-in-out infinite;
  pointer-events: none;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-20px) rotate(1deg); }
  66% { transform: translateY(20px) rotate(-1deg); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.fadeIn {
  animation: fadeIn 0.5s ease-in-out;
}

.login-wrapper {
  max-width: 500px;
  width: 100%;
  position: relative;
  z-index: 1;
  padding-top: 40px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.logo-container {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

.logo {
  width: 120px;
  height: 120px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  transition: transform 0.3s ease;
}

.logo:hover {
  transform: scale(1.05);
}

.mainTitle {
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0 0 10px 0;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
  font-size: 1rem;
  margin: 0 0 30px 0;
  color: #F5F1E3;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.login-card {
  background: rgba(255, 255, 255, 0.15);
  padding: 40px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 20px;
}

.error-alert {
  background: rgba(220, 53, 69, 0.9);
  color: white;
  padding: 12px 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 0.85rem;
  border-left: 4px solid #dc3545;
}

.input-group {
  margin-bottom: 20px;
}

.login-label {
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 8px;
  color: white;
  display: block;
}

.login-input {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  font-size: 0.9rem;
  font-family: 'Poppins', sans-serif;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.login-input:focus {
  outline: none;
  border-color: #F5F1E3;
  background: white;
  box-shadow: 0 0 0 3px rgba(245, 241, 227, 0.2);
}

.password-wrapper {
  position: relative;
}

.password-wrapper .login-input {
  padding-right: 45px;
}

.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-password:hover {
  color: #333;
}

.login-button {
  width: 100%;
  background: linear-gradient(135deg, #F5F1E3 0%, #e8e4d1 100%);
  color: #1A4D2E;
  border: none;
  padding: 15px 30px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Poppins', sans-serif;
  text-transform: uppercase;
  letter-spacing: 1px;
  min-width: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  background: linear-gradient(135deg, #e8e4d1 0%, #F5F1E3 100%);
}

.login-button.loading {
  opacity: 0.7;
  cursor: not-allowed;
}

.loadingSpinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(26, 77, 46, 0.3);
  border-radius: 50%;
  border-top-color: #1A4D2E;
  animation: spin 1s ease-in-out infinite;
  margin-right: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.back-link-container {
  text-align: center;
  margin-bottom: 20px;
}

.back-link {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.back-link:hover {
  color: #F5F1E3;
  text-decoration: underline;
}

.footer {
  text-align: center;
  margin-top: 30px;
}

.footer small {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
}

@media (max-width: 480px) {
  .login-card {
    padding: 25px 20px;
  }
}
</style>
