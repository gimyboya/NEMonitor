import Vue from 'vue';
import ElementUI from 'element-ui'
import locale from 'element-ui/lib/locale/lang/en'
import App from './app';

Vue.use(ElementUI, { locale })

const app = new Vue(App).$mount('#app');