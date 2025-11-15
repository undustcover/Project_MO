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
          <div class="header-brand">川庆国际项目运营管理部@HugoXu</div>
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
.app-container :root {
  --brand: #2f88ff;
  --bg: #f8fafc;
  --bg-grad-end: #eef2f7;
  --text: #334155;
  --text-muted: #475569;
  --aside-bg: #0f172a;
  --aside-text: #e2e8f0;
  --header-bg: #111827;
  --header-text: #e5e7eb;
  --card-bg: #ffffff;
  --radius: 12px;
  --shadow: 0 8px 28px rgba(15,23,42,0.08);
  --border: #e2e8f0;
  --menu-active: #1f2937;
}
.app-container { height: 100vh; background: linear-gradient(135deg, var(--bg) 0%, var(--bg-grad-end) 100%); font-family: "Segoe UI", "Inter", "PingFang SC", "Hiragino Sans", "Microsoft YaHei", Arial, sans-serif; }
.app-aside { padding: 16px; background:#0f172a; color:#e2e8f0; }
.brand { font-weight: 800; margin: 8px 0 16px; letter-spacing: .4px; }
.app-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background:var(--header-bg); color:var(--header-text); }
.header-title { font-weight: 600; }
.header-brand { font-size: 12px; padding: 6px 10px; border-radius: 999px; background: linear-gradient(135deg,#1f2937 0%, #374151 100%); color:#e5e7eb; border:1px solid #4b5563; }
.app-aside :deep(.el-menu) { background: transparent; border-right: none; }
.app-aside :deep(.el-menu-item), .app-aside :deep(.el-sub-menu__title) { color:#cbd5e1; }
.app-aside :deep(.el-menu-item.is-active) { background:var(--menu-active); color:#fff; border-radius:8px; }
.app-aside :deep(.el-menu-item:hover) { background:var(--menu-active); color:#fff; border-radius:8px; }
</style>