<template>
  <el-config-provider :size="'default'">
    <el-container class="app-container">
      <el-aside width="260px" class="app-aside">
        <div class="brand">项目管理系统</div>
        <el-menu :default-openeds="['1']" router>
          <el-sub-menu index="1">
            <template #title>项目</template>
            <el-menu-item index="/projects">项目列表</el-menu-item>
            <el-menu-item index="/projects/new">新建项目</el-menu-item>
          </el-sub-menu>
          <el-menu-item index="/progress">进度</el-menu-item>
          <el-menu-item index="/cost">成本</el-menu-item>
          <el-menu-item index="/revenue">收入</el-menu-item>
          <el-menu-item index="/alerts">预警</el-menu-item>
        </el-menu>
      </el-aside>
      <el-container>
        <el-header class="app-header">
          <div class="header-title">仪表盘与管理</div>
        </el-header>
        <el-main>
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </el-config-provider>
  
</template>

<script setup lang="ts">
</script>

<style scoped>
.app-container { height: 100vh; }
.app-aside { border-right: 1px solid #ebedf0; padding: 12px; }
.brand { font-weight: 600; margin: 8px 0 12px; }
.app-header { border-bottom: 1px solid #ebedf0; display: flex; align-items: center; }
.header-title { font-weight: 500; }
</style>