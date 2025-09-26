<template>
  <div class="map-container">
    <iframe
      src="/corporate-rpg.html"
      class="map-iframe"
      title="公司園區地圖"
      @load="onMapLoad"
    ></iframe>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

function onMapLoad() {
  console.log('地圖載入完成')
}

onMounted(() => {
  // 可以在這裡添加地圖初始化邏輯
})
</script>

<style scoped>
.map-container {
  width: 100%;
  height: calc(100vh - 60px); /* 減去 navbar 高度 */
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f5f5;
}

.map-iframe {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .map-container {
    height: calc(100vh - 56px);
  }

  .map-iframe {
    border-radius: 0;
  }
}
</style>