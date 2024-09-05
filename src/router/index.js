import {createRouter, createWebHashHistory} from 'vue-router'
import ModelTraining from '../components/training/ModelTraining.vue';
import ModelInference from "../components/inference/ModelInference.vue";

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/training',
            name: 'ModelTraining',
            component: ModelTraining
        },
        {
            path: '/inference',
            name: 'ModelInference',
            component: ModelInference
        },
        {
            path: "/",
            redirect: "/training"
        }
    ]
})

export default router
