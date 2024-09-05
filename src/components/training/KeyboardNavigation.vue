<script setup>
import { onMounted, onBeforeUnmount } from "vue";

const emit = defineEmits(["left", "right"])

const handler = function (e) {
    if (e.defaultPrevented) {
      return;
    }

    if(e.keyCode === 37) {
        emit("left");
    } else if(e.keyCode === 39) {
        emit("right");
    }
}

onMounted(() => {
    window.addEventListener('keydown', handler);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handler);
});
</script>

<template>
  <div></div>
</template>

<style lang="stylus" scoped>
  div {
    display: none;
  }
</style>
