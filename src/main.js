import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import auth from './router/auth'

import './style.css'  // 你可以用一般 CSS

const app = createApp(App)
app.use(router)

auth.fetchMe().finally(() => {
	app.mount('#app')
})