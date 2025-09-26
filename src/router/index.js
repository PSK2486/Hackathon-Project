import { createRouter, createWebHistory } from 'vue-router'

import Dashboard from '../views/Dashboard.vue'
import Training from '../views/Training.vue'
import CourseDetail from '../views/CourseDetail.vue'
import Community from '../views/Community.vue'
import Notifications from '../views/Notifications.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import MapView from '../views/MapView.vue'

const routes = [
  { path: '/', name: 'Dashboard', component: Dashboard },
  { path: '/training', name: 'Training', component: Training },
  { path: '/training/course/:id', name: 'CourseDetail', component: CourseDetail, props: true },
  { path: '/community', name: 'Community', component: Community },
  { path: '/notifications', name: 'Notifications', component: Notifications },
  { path: '/map', name: 'Map', component: MapView },
  { path: '/login', name: 'Login', component: Login },
  { path: '/register', name: 'Register', component: Register },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router