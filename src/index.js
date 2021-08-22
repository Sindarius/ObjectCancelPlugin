import ObjectCancel from './ObjectCancel.vue'

import vue from 'vue'

vue.component('object-cancel-plugin', ObjectCancel);
import { registerRoute } from '../../routes'


registerRoute(ObjectCancel, {
    Job: {
        ObjectCancel: {
            icon: 'mdi-cancel',
            caption: 'Object Cancel',
            path: '/Job/ObjectCancel'
        }
    }
})