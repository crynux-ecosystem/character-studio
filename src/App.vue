<script setup>
import {RouterLink, RouterView} from 'vue-router'
import { FundOutlined, PictureOutlined } from '@ant-design/icons-vue'
import {ref, watch} from "vue";
import {useRoute} from "vue-router";
import MainConfig from "@/components/config/MainConfig.vue";
import {useNodeStore} from "@/stores/node";
import {createV1Client} from "@/api/v1/v1";
import {useClientStore} from "@/stores/client";
import {v4 as uuidV4} from "uuid";

const mainMenuSelectedKeys = ref(['Training']);
const route = useRoute();
watch(route, (to) => {
    if(/^\/training/.test(to.path)) {
        mainMenuSelectedKeys.value.length = 0;
        mainMenuSelectedKeys.value.push('Training');
    } else if (/^\/inference/.test(to.path)) {
        mainMenuSelectedKeys.value.length = 0;
        mainMenuSelectedKeys.value.push('Inference');
    }
}, {flush: 'pre', immediate: true, deep: true})


const nodeStore = useNodeStore()
if(nodeStore.isNodeFilled) {
    createV1Client(nodeStore.nodeUrl)
}

const clientStore = useClientStore()
if(clientStore.client_id === '') {
    clientStore.client_id = uuidV4();
}

</script>

<template>
    <a-menu
        mode="vertical"
        v-model:selected-keys="mainMenuSelectedKeys"
        style="width: 256px; height: 100%; -webkit-app-region: drag;user-select: none;user-drag: none;"
    >
            <div class="logo">
                Character Studio
            </div>
            <a-menu-item key="Training">
                <template #icon>
                    <FundOutlined />
                </template>
                <router-link :to="{name:'ModelTraining'}">
                    <span>Training</span>
                </router-link>
            </a-menu-item>
            <a-menu-item key="Inference">
                <template #icon>
                      <PictureOutlined />
                </template>
                <router-link :to="{name:'ModelInference'}">
                    <span>Generating</span>
                </router-link>
            </a-menu-item>
            <main-config class="main-config"></main-config>
    </a-menu>
    <div class="main-page">
        <RouterView/>
    </div>
</template>
<style scoped lang="stylus">
.main-page
    position absolute
    left 256px
    right 0
    top 0
    bottom 0
    -webkit-app-region drag

.logo
    height 60px
    padding 32px 24px
    font-size 28px

.main-config
    position absolute
    bottom 8px
    left 8px
</style>

<style>
.main-page * {
    -webkit-app-region: no-drag;
}
.ant-menu-item {
     -webkit-app-region: no-drag;
}
</style>
