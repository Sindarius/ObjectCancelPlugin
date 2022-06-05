import ObjectCancel from './ObjectCancel.vue'

import { registerRoute } from '@/routes'

registerRoute(ObjectCancel, {
    Job: {
        ObjectCancel: {
            icon: 'mdi-cancel',
            caption: 'Object Cancel',
            path: '/Job/ObjectCancel'
        }
    }
})