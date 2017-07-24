import Vue from 'vue';
import VueWorker from 'vue-worker';
import Vuetify from 'vuetify'
import App from './app';

Vue.use(Vuetify);
Vue.use(VueWorker);

const app = new Vue(App).$mount('#app');