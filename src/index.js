import ObjectCancel from './ObjectCancel.vue'

import { registerRoute } from '@/routes'

registerRoute(ObjectCancel, {
    Plugins: {
        ObjectCancel: {
            icon: 'mdi-cancel',
            caption: 'Object Cancel',
            path: '/Job/ObjectCancel'
        }
    }
});