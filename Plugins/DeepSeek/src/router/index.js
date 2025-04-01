import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router';
import deepseekIndex from '@/views/deepseek/index.vue';
import hexagramsIndex from '@/views/hexagrams/index.vue';
import test from '@/views/test/test.vue';

const routes = [
  {
    path: '/deepseekIndex',
    name: 'deepseekIndex',
    component: deepseekIndex
  },
  {
    path: '/hexagramsIndex',
    name: 'hexagramsIndex',
    component: hexagramsIndex
  },
  {
    path: '/test',
    name: 'test',
    component: test
  }
];

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes // short for `routes: routes`
});

export default router;