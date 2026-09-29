<template>
  <div class="serverinfo-view">
    <ServerInfo />
  </div>
</template>

<script setup>
import ServerInfo from '../components/pages/ServerInfo.vue'
</script>

<style scoped>
.serverinfo-view {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
