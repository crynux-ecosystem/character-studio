<script setup>
import {onUpdated, ref} from "vue";
const props = defineProps(["logs", "resultStatus"]);
const consoleRef = ref();

onUpdated(() => {
    consoleRef.value.scrollTop = consoleRef.value.scrollHeight;
});

</script>
<template>
    <div :class="{'console':true, 'success':props.resultStatus==='SUCCESS','error':props.resultStatus==='FAILURE'}" ref="consoleRef" v-html="props.logs"></div>
</template>

<style scoped lang="stylus">
.console
    height 200px
    background-color #333
    margin-top 16px
    padding 8px 16px
    color white
    overflow auto
    border 2px solid #333

    &.success
        border-color mediumseagreen

    &.error
        border-color indianred
</style>
