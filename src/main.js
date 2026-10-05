import { createApp } from 'vue'
import './assets/styles/main.css'
import App from './App.vue'
import router from './router'

import { initAuth } from './composables/useAuth'

const init = async () => {
  await initAuth()
  
  const app = createApp(App)
  app.use(router)
  app.mount('#app')
}

init()
